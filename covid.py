#!/usr/bin/env python3

import copy
import datetime
import json
import logging
import os.path
import sys

import boto3
from fbprophet import Prophet
import requests
import pandas as pd

from data import states_table

logging.getLogger('fbprophet').setLevel(logging.WARNING)

class State:
    roc_metrics = ['death', 'hospitalizedCurrently', 'inIcuCurrently', 
                   'positiveIncrease']
    def __init__(self, name):
        self.name = name
        self.days = {}
        self.projected_days = {}
        self.rocdeath = 0
        self.totaldeath = 0
        self.newdeath = 0

    def add_day(self, date, name, data=None):
        if date in self.days.keys():
            raise ValueError('Already exists')
        day = Day(date)
        if not data:
            data = get_data(date=date, state=name)
        error = data.get('error')
        if error and error == True:
            raise IOError(data.get('message'))
        for k, v in data.items():
            if v is not None:
                setattr(day, k, v)
        self.days[date] = day
        for metric in self.roc_metrics:
            if metric in data.keys():
                self.rate_of_change(date, metric)
        if date == max(self.days.keys()):
            if hasattr(self.days[date], 'roc_death'):
                self.roc_death = self.days[date].roc_death
                self.totaldeath = self.days[date].death
                self.newdeath = self.days[date].deathIncrease

    def add_today(self):
        today = datetime.datetime.today().strftime('%Y%m%d')
        if today in self.days.keys():
            raise ValueError('Already exists')
        self.add_day(today, self.name)

    def rate_of_change(self, day, metric):
        this_day = self.days[day]
        roc_name = 'roc_' + metric
        if hasattr(this_day, roc_name):
            raise ValueError('Already exists')
        previous_day = self.days.get(day - 1)
        todays_metric = getattr(this_day, metric)
        if previous_day and hasattr(previous_day, metric) and todays_metric:
            previous_metric = getattr(previous_day, metric)
            if previous_metric:
                setattr(this_day, roc_name, (
                    (todays_metric - previous_metric) / previous_metric))
            else:
                setattr(this_day, roc_name, 0.0)
        else:
            setattr(this_day, roc_name, 0.0)


class Day:
    def __init__(self, date, state=None, positive=None, negative=None,
                 pending=None, hospitalizedCurrently=None, 
                 hospitalizedCumulative=None, inIcuCurrently=None,
                 inIcuCumulative=None, onVentilatorCurrently=None, 
                 onVentilatorCumulative=None, recovered=None, hash=None, 
                 dateChecked=None, death=None, hospitalized=None, total=None, 
                 totalTestResults=None, posNeg=None, fips=None, 
                 deathIncrease=None, hospitalizedIncrease=None, 
                 negativeIncrease=None, positiveIncrease=None, 
                 totalTestResultsIncrease=None, 
                 model_hospitalizedCurrently=None, model_inIcuCurrently=None,
                 model_death=None, model_death_pct05=None, 
                 model_death_pct95=None, model_deathIncrease=None, 
                 model_deathIncrease_pct05=None, model_deathIncrease_pct95=None):
        self.date = date
        self.state = state
        self.positive = positive
        self.negative = negative
        self.pending = pending
        self.hospitalizedCurrently = hospitalizedCurrently
        self.hospitalizedCumulative = hospitalizedCumulative
        self.inIcuCurrently = inIcuCurrently
        self.inIcuCumulative = inIcuCumulative
        self.onVentilatorCurrently = onVentilatorCurrently
        self.onVentilatorCumulative = onVentilatorCumulative
        self.recovered = recovered
        self.hash = hash
        self.dateChecked = dateChecked
        self.death = death
        self.hospitalized = hospitalized
        self.total = total
        self.totalTestResults = totalTestResults
        self.posNeg = posNeg
        self.fips = fips
        self.deathIncrease = deathIncrease
        self.hospitalizedIncrease = hospitalizedIncrease
        self.negativeIncrease = negativeIncrease
        self.positiveIncrease = positiveIncrease
        self.totalTestResultsIncrease = totalTestResultsIncrease
        self.model_hospitalizedCurrently=model_hospitalizedCurrently
        self.model_inIcuCurrently=model_inIcuCurrently
        self.model_death=model_death
        self.model_death_pct05=model_death_pct05
        self.model_death_pct95=model_death_pct95
        self.model_deathIncrease=model_deathIncrease
        self.model_deathIncrease_pct05=model_deathIncrease_pct05
        self.model_deathIncrease_pct95=model_deathIncrease_pct95


def get_data(state='all', date='daily'):
    if state == 'all':
        state_path = ''
    else:    
        state_path = '{}/'.format(state.lower())
    r = requests.get(url='https://covidtracking.com/api/v1/states/{}{}.json'.format(
        state_path, date))
    return r.json()


def train(model_name, df, state_name, states, periods=30, frequency='D',
          history=True, plot=False):
    model = Prophet(weekly_seasonality=True, interval_width=0.95,
                    changepoint_prior_scale=.1)
    train_df = df.rename(columns={model_name:'y'})
    train_df["ds"] = train_df.index
    model.fit(train_df)

    pd.plotting.register_matplotlib_converters()
    future = model.make_future_dataframe(
        periods=periods, freq=frequency,
        include_history=history)
    forecast = model.predict(future)

    if plot:
        fig = model.plot(forecast)
        axes = fig.get_axes()
        axes[0].set_title('{} - {}'.format(state_name, model_name), size=20)
        axes[0].set_xlabel('Date')
        axes[0].set_ylabel(model_name)

    model_records = forecast.to_dict('records')
    for record in model_records:
        record_date = int(record['ds'].strftime('%Y%m%d'))
        if record_date not in states[state_name].days.keys():
            states[state_name].days[record_date] = Day(
                    date=record_date, state=state_name)
        setattr(states[state_name].days[record_date], 
                'model_{}'.format(model_name),
                record['yhat'])
        setattr(states[state_name].days[record_date], 
                'model_{}_pct05'.format(model_name),
                record['yhat_lower'])
        setattr(states[state_name].days[record_date], 
                'model_{}_pct95'.format(model_name),
                record['yhat_upper'])


def full_update(ignore_history=False, plot=False, export=True, export_type='s3',
                state='all', date='daily', s3_bucket='cv19.report'):
    if not ignore_history and not is_updated():
        return

    selected_models = ['death', 'deathIncrease', 'inIcuCurrently', 
                       'hospitalizedCurrently', 'positiveIncrease']
    agg_models = []
    for model in selected_models:
        agg_models += ['model_{}'.format(model), 
                       'model_{}_pct05'.format(model),
                       'model_{}_pct95'.format(model)]
    metrics = selected_models + agg_models
    states = {}
    data_set = get_data(state=state, date=date)
    data_set.reverse()
    for data in data_set:
        if data['state'] not in states.keys():
            states[data['state']] = State(data['state'])
        states[data['state']].add_day(
                date=data['date'], name=data['state'], data=data)
    sorted_states = sorted(
            states.values(), key=lambda state: state.newdeath, reverse=True)

    for state in sorted_states:
        df = pd.DataFrame(
                [{'date': pd.to_datetime(
                    day.date, format='%Y%m%d', errors='ignore'),
                  'death': day.death,
                  'deathIncrease': day.deathIncrease,
                  'inIcuCurrently': day.inIcuCurrently,
                  'hospitalizedCurrently': day.hospitalizedCurrently,
                  'positiveIncrease': day.positiveIncrease
                  } for day in state.days.values() if hasattr(day, 'death')])
        df.date = pd.to_datetime(df.date)
        df.set_index('date', inplace=True)
    
        for model_name in selected_models:
            if getattr(df, model_name).count() > 5:
                train(model_name=model_name, df=df, state_name=state.name, 
                      states=states, plot=True)

    combined = prepare_combined(states=states, metrics=metrics, plot=plot)

    if export:
        export_data(states=states, metrics=metrics, combined=combined,
                    export_type=export_type, s3_bucket=s3_bucket)


def export_data(states, metrics, combined=None, export_type='s3', 
                s3_bucket='cv19.report'):
    if export_type == 's3':
        export_func = write_json_s3
    elif export_type == 'file':
        export_func = write_file
    else:
        raise ValueError

    # Export states
    state_codes = ['US']
    for state_name, state in states.items():
        if state.totaldeath:
            state_codes.append(state_name)
            export = []
            for day in state.days.values():
                datestr = str(day.date)
                record = {
                        'date': '{}-{}-{}'.format(datestr[:4], 
                                                  datestr[4:6], 
                                                  datestr[6:])}
                for metric_name in metrics:
                    if hasattr(day, metric_name):
                      record[metric_name] = getattr(day, metric_name)
                export.append(record)

            export_func(filename='{}.json'.format(state_name.lower()),
                        json_data=export, s3_bucket=s3_bucket)

    # Export Combined
    if combined:
        export = []
        for day in combined:
            record = {'date': day['date'].strftime('%Y-%m-%d')}
            for metric_name in metrics:
                metric = day.get(metric_name)
                if metric:
                    record[metric_name] = metric
            export.append(record)
            export.sort(key=lambda d: d['date'])
        export_func(filename='us.json', json_data=export, s3_bucket=s3_bucket)

    state_code_table = [state for state in states_table if state['value'] in state_codes]
    export_func(filename='states.json', json_data=state_code_table, 
                s3_bucket=s3_bucket)


def prepare_combined(states, metrics, plot=False):
    state_codes = [state for state in states.keys()]
    dates = set()
    for state in states.values():
        for date in state.days.keys():
            dates.add(date)
    combined = []
    today = datetime.datetime.today().strftime('%Y%m%d')
    future_limit = int(
            (datetime.datetime.today() + 
             datetime.timedelta(days=30)).strftime('%Y%m%d'))
    for date in dates:
        if date <= future_limit:
            day = {
                'date': pd.to_datetime(date, format='%Y%m%d')
                }

            for model in metrics:
                total = sum(
                    [getattr(state.days[date], model) for
                     state in states.values() if
                     state.days.get(date) and 
                     hasattr(state.days[date], model) and
                     getattr(state.days[date], model) is not None])
                if total:
                    day[model] = total

            combined.append(day)
    df = pd.DataFrame(combined)
    df.set_index('date', inplace=True)

    # Needed to compute rolling avg
    df.sort_values(by=['date'], inplace=True, ascending=True)

    if plot:
        import matplotlib.pyplot as plt
        fig, ax1 = plt.subplots(1,1, figsize=(15,10))
        ax1.title.set_text('Combined - {} deaths'.format(int(df.death.max())))
        df.model_death.plot(color='red', label='Model', linestyle=":")
        df.death.plot(ax=ax1, color='blue', label='Actual')
        ax1.set_ylabel('Deaths')
        ax1.legend(loc=2)
        ax2 = ax1.twinx()
        df.deathIncrease.plot(ax=ax2, color='lightgreen', label='Daily')
        ax2.set_ylabel('Daily')
        ax2.legend(loc=0)
        df['DailyMA'] = df.deathIncrease.rolling(7).mean()
        pd.set_option('display.max_rows', None)
        df.DailyMA.plot(ax=ax2, color='green', label='DailyMA')
        ax2.set_ylabel('DailyMA')
        ax2.legend(loc=1)
        plt.show()

    return combined


def write_json_s3(filename, json_data, path='api/', s3_bucket='cv19.report'):
    s3 = boto3.resource('s3')
    s3object = s3.Object(s3_bucket, '{}{}'.format(
        path, filename))
    s3object.put(
            Body=(bytes(json.dumps(json_data).encode('UTF-8'))),
            ContentType='application/json')


def write_file(filename, json_data):
    with open(filename, 'w') as f:
        json.dump(json_data, f)


def is_updated():
    r = requests.get(url='https://cv19.report/api/us.json')
    if r.status_code != 200:
        return True
    else:
        data = r.json()
        dates = [event['date'] for event in data if event.get('death')]
        last_date_local = int(dates[-1].replace('-', ''))
        r = requests.get(url='https://covidtracking.com/api/v1/us/current.json')
        last_date_remote = r.json()[0]['date']
        print(last_date_local, last_date_remote)
        if last_date_remote > last_date_local:
            return True

if __name__ == '__main__':
    print(sys.argv)
    if len(sys.argv) > 1:
        full_update(ignore_history=sys.argv[1])
    else:
        full_update()
