import React, { useState } from "react";
import _ from "underscore";
import { render } from "react-dom";
import { TimeSeries } from "pondjs";
import {
  Resizable,
  Charts,
  ChartContainer,
  ChartRow,
  YAxis,
  BandChart,
	LineChart,
	Legend,
  styler
} from "react-timeseries-charts";
import { format } from "d3-format";
import Select from 'react-select';
import useStyles from "./IndexStyles";
import SimpleModal from "./SimpleModal/SimpleModal";


const saveSvgAsPng = require('save-svg-as-png')
const apiUrl = process.env.REACT_APP_API_URL


function getLast(res) {
	let latestValue;
	for (var value of res) {
		if (value.deathIncrease) {
			latestValue = value.deathIncrease;
		}
	}
	return latestValue
}

function setQueryParams(value) {
	if (value === "US") {
		window.history.pushState(null, null, '/')
	} else {
		window.history.pushState(null, null, `/?state=${value}`)
	}
}

class CrossHairs extends React.Component {
    render() {
        const { x, y } = this.props;
        const style = { pointerEvents: "none", stroke: "#ccc" };
        if (!_.isNull(x) && !_.isNull(y)) {
            return (
                <g>
                    <line style={style} x1={0} y1={y} x2={this.props.width} y2={y} />
                    <line style={style} x1={x} y1={0} x2={x} y2={this.props.height} />
                </g>
            );
        } else {
            return <g />;
        }
    }
}


class SimpleChart extends React.Component {
	constructor(props) {
		super(props);
		let params = (new URL(document.location)).searchParams;
		let state_value = params.get("state");
		if (!state_value) {
			state_value = "US"
		}
		this.state = {
			highlight: null,
			selection: null,
			stateCode: state_value,
			tracker: null,
			timerange: null,
      x: null,
      y: null,
			data: [],
			states: [],
			isLoaded: false,
	  };
	}

	handleTrackerChanged = tracker => {
        if (!tracker) {
            this.setState({ tracker, x: null, y: null });
        } else {
            this.setState({ tracker });
        }
	};

	handleTimeRangeChange = timerange => {
			this.setState({ timerange });
	};

	handleMouseMove = (x, y) => {
			this.setState({ x, y });
	};
	
	handleSchemeChange = async ({ value }) => {
		  let selectedState = this.state.states.find(state => state.value === value);
			this.setState({
				stateCode: value,
				stateName: selectedState.label,
			});
		  await fetch(`${apiUrl}${value.toLowerCase()}.json`)
		    .then(res => res.json())
				.then(
					(result) => {
						this.setState({
							data: result,
							actualDeathIncreaseLatest: getLast(result)
						});
					},
					(error) => {
						this.setState({
							error
						});
					}
				)
		    .then(
					setQueryParams(value)
				)
	};

	fetchData = async () => {
		await fetch(`${apiUrl}states.json`)
		    .then(res => res.json())
				.then(
					(result) => {
						this.setState({
							states: result
						});
					},
					(error) => {
						this.setState({
							error
						});
					}
				)
		await this.handleSchemeChange({value: this.state.stateCode})
		this.setState({ isLoaded: true})
	}


	componentDidMount() {
		this.fetchData();
	};

	

	render() {

		  let series = new TimeSeries({
				name: "series",
				columns: [
					"index", 
					"death", "model_death", "model_death_error",
					"deathIncrease", "model_deathIncrease", "model_deathIncrease_error",
					"inIcuCurrently", "model_inIcuCurrently", "model_inIcuCurrently_error",
					"hospitalizedCurrently", "model_hospitalizedCurrently", "hospitalizedCurrently_error",
					"positiveIncrease", "model_positiveIncrease", "model_positiveIncrease_error",
				],
				points: this.state.data.map(({ 
					date,
					death, model_death, model_death_pct05, model_death_pct95, 
					deathIncrease, model_deathIncrease, model_deathIncrease_pct05, model_deathIncrease_pct95,
					inIcuCurrently, model_inIcuCurrently, model_inIcuCurrently_pct05, model_inIcuCurrently_pct95, 
					hospitalizedCurrently, model_hospitalizedCurrently, model_hospitalizedCurrently_pct05, model_hospitalizedCurrently_pct95, 
					positiveIncrease, model_positiveIncrease, model_positiveIncrease_pct05, model_positiveIncrease_pct95, 
				}) => [
						date,
						death,
						model_death,
						[model_death_pct05, null, null, model_death_pct95],
						deathIncrease,
						model_deathIncrease,
						[model_deathIncrease_pct05, null, null, model_deathIncrease_pct95],
						inIcuCurrently,
						model_inIcuCurrently,
						[model_inIcuCurrently_pct05, null, null, model_inIcuCurrently_pct95],
						hospitalizedCurrently,
						model_hospitalizedCurrently,
						[model_hospitalizedCurrently_pct05, null, null, model_hospitalizedCurrently_pct95],
						positiveIncrease,
						model_positiveIncrease,
						[model_positiveIncrease_pct05, null, null, model_positiveIncrease_pct95],
					])
			});

		  if (this.state.timerange === null){
        this.setState({ timerange:  series.range()});
			}

		  const f = format(",");
		
		  let dailyDeathValue, totalDeathValue, modelDeathDailyValue, modelDeathValue;
		  let inIcuCurrentlyValue, modelinIcuCurrentlyValue;
		  let hospitalizedCurrentlyValue, modelhospitalizedCurrentlyValue;
		  let positiveIncreaseValue, modelpositiveIncreaseValue;
			if (this.state.tracker) {
				const seriesIndex = series.bisect(this.state.tracker);
				const seriesTrackerEvent = series.at(seriesIndex);
				if (seriesTrackerEvent.get("death")) {
					totalDeathValue = `${f(seriesTrackerEvent.get("death"))}`;
				};
		    if (seriesTrackerEvent.get("model_death")) {
					modelDeathValue = `${f(parseInt(seriesTrackerEvent.get("model_death"), 10))}`;
				};
		    if (seriesTrackerEvent.get("deathIncrease")) {
					dailyDeathValue = `${f(seriesTrackerEvent.get("deathIncrease"))}`;
				};
		    if (seriesTrackerEvent.get("model_deathIncrease")) {
					modelDeathDailyValue = `${f(parseInt(seriesTrackerEvent.get("model_deathIncrease"), 10))}`;
				};
				if (seriesTrackerEvent.get("inIcuCurrently")) {
					inIcuCurrentlyValue = `${f(seriesTrackerEvent.get("inIcuCurrently"))}`;
				};
		    if (seriesTrackerEvent.get("model_inIcuCurrently")) {
					modelinIcuCurrentlyValue = `${f(parseInt(seriesTrackerEvent.get("model_inIcuCurrently"), 10))}`;
				};
				if (seriesTrackerEvent.get("hospitalizedCurrently")) {
					hospitalizedCurrentlyValue = `${f(seriesTrackerEvent.get("hospitalizedCurrently"))}`;
				};
		    if (seriesTrackerEvent.get("model_hospitalizedCurrently")) {
					modelhospitalizedCurrentlyValue = `${f(parseInt(seriesTrackerEvent.get("model_hospitalizedCurrently"), 10))}`;
				};
				if (seriesTrackerEvent.get("positiveIncrease")) {
					positiveIncreaseValue = `${f(seriesTrackerEvent.get("positiveIncrease"))}`;
				};
		    if (seriesTrackerEvent.get("model_positiveIncrease")) {
					modelpositiveIncreaseValue = `${f(parseInt(seriesTrackerEvent.get("model_positiveIncrease"), 10))}`;
				};
			} else {
				  dailyDeathValue = `${f(this.state.actualDeathIncreaseLatest)}`;
					totalDeathValue = `${f(series.max("death"))}`;
				  inIcuCurrentlyValue = `${f(this.state.inIcuCurrentlyLatest)}`;
				  hospitalizedCurrentlyValue = `${f(this.state.hospitalizedCurrentlyLatest)}`;
				  positiveIncreaseValue = `${f(this.state.positiveIncreaseLatest)}`;
			}

		const style = styler([
			{ key: "model_death_error", color: "red", width: 1, opacity: 1 },
			{ key: "model_death", color: "red", width: 1, dashed: true},
			{ key: "death", color: "red", width: 2},
			{ key: "model_deathIncrease_error", color: "steelblue", width: 1, opacity: 1 },
			{ key: "model_deathIncrease", color: "blue", width: 1, dashed: true},
			{ key: "deathIncrease", color: "blue", width: 2},
		]);

		const leftAxis = {
			label: {fill: "red"},
		};

		const rightAxis = {
			label: {fill: "blue"},
		};

		const styleDeath = styler([
				{ key: "error", color: "red", width: 1, opacity: 1 },
				{ key: "median", color: "red", width: 1, dashed: true},
				{ key: "actual", color: "red", width: 2}
		]);

		const styleDeathIncrease = styler([
				{ key: "error", color: "steelblue", width: 1, opacity: 1 },
				{ key: "median", color: "blue", width: 1, dashed: true},
				{ key: "actual", color: "blue", width: 2}
		]);
		
	 const legendStyle = styler([
				{key: "actualDeath", color: "red", width: 4},
				{key: "dailyDeath", color: "blue", width: 4},
				{key: "modelDeath", color: "red", width: 2, dashed: true},
				{key: "modelDeathDaily", color: "blue", width: 2, dashed: true}
		]); 
		const { error, isLoaded, states } = this.state;
		if (error) {
			return <div>Error: {error.message}</div>;
		} else if (!isLoaded) {
			return <div>Loading...</div>;
		} else {
					return (
							<div>
									<div className="row">
											<div className="col-md-12 text-left">
													<strong className="text-center">COVID-19 model for </strong>
											</div>
											<div className="col-md-3">
													<Select
															name="form-field-name"
															options={states}
															clearable={false}
															value={states.find(state => state.value === this.state.stateCode)}
															onChange={value => this.handleSchemeChange(value)}
													/>
											</div>
									</div>
									<hr />
									<div className="row">
											<div className="col-md-12" id="chart">
													<Resizable>
															<ChartContainer 
																	timeRange={series.range()}
																	timeAxisStyle={{
																			ticks: {
																					stroke: "#AAA",
																					opacity: 0.25,
																					"stroke-dasharray": "1,1"
																			},
																			values: {
																					fill: "#AAA",
																					"font-size": 12
																			}
																	}}
																	maxTime={series.range().end()}
																	minTime={series.range().begin()}
																	timeAxisAngledLabels={true}
																	timeAxisHeight={65}
																	onTrackerChanged={this.handleTrackerChanged}
																	onBackgroundClick={() => this.setState({ selection: null })}
																	enablePanZoom={true}
																	onTimeRangeChanged={this.handleTimeRangeChange}
																	onMouseMove={(x, y) => this.handleMouseMove(x, y)}
																	minDuration={1000 * 60 * 60 * 24 * 30}
						                      title={`${this.state.stateCode} - ${series.max("death")} (${this.state.actualDeathIncreaseLatest} new)`}
						                      titleHeight={0}
						                      titleStyle={{ 
																		fontWeight: 100, 
																		fontSize: 24, 
																		font: '"Goudy Bookletter 1911", sans-serif"',
																		fill: "#C0C0C0" 
																	}}
															>
																	<ChartRow height="400">
																			<YAxis
																					id="total-death-axis"
																					label="Deaths"
																					min={0}
																					max={_.max([series.max("model_death"), series.max("death")])}

																					format=".2s"
																					width="30"
																					type="linear"
																					color="red"
																					visible={true}
						                              labelOffset={55}
						                              style={leftAxis}
																			/>
																			<Charts>
																					<BandChart
																							axis="daily-death-axis"
																							style={style}
																							spacing={1}
																							column="model_deathIncrease_error"
																							interpolation="curveBasis"
																							series={series}
																					/>
																					<LineChart
																							axis="daily-death-axis"
																							style={style}
																							spacing={1}
																							columns={[
																								"deathIncrease", 
																								"model_deathIncrease"]}
																							interpolation="curveBasis"
																							series={series}
																							highlight={this.state.highlight}
																							onHighlightChange={highlight =>
																									this.setState({ highlight })
																							}
																							selection={this.state.selection}
																							onSelectionChange={selection =>
																									this.setState({ selection })
																							}
																					/>
																					<BandChart
																							axis="total-death-axis"
																							style={style}
																							spacing={1}
																							column="model_death_error"
																							interpolation="curveBasis"
																							series={series}
																					/>
																					<LineChart
																							axis="total-death-axis"
																							style={style}
																							spacing={1}
																							columns={[
																								"death", "model_death"]}
																							interpolation="curveBasis"
																							series={series}
																							highlight={this.state.highlight}
																							onHighlightChange={highlight =>
																									this.setState({ highlight })
																							}
																							selection={this.state.selection}
																							onSelectionChange={selection =>
																									this.setState({ selection })
																							}
																					/>
																					<CrossHairs x={this.state.x} y={this.state.y} />
																			</Charts>
																			<YAxis
																					id="daily-death-axis"
																					label="Death Increase"
																					min={0}
																					max={_.max([series.max("model_deathIncrease"), series.max("deathIncrease")])}
																					format=".2s"
																					width="30"
																					type="linear"
																					align="right"
																					visible={true}
						                              labelOffset={-57}
						                              style={rightAxis}
																			/>
																	</ChartRow>
															</ChartContainer>
													</Resizable>
											</div>
											<div className="row">
												<div className="col-md-9">
														<Legend
																		type="line"
																		align="right"
																		style={legendStyle}
																		highlight={this.state.highlight}
																		onHighlightChange={highlight => this.setState({highlight})}
																		selection={this.state.selection}
																		onSelectionChange={selection => this.setState({selection})}
																		categories={[
																				{ key: "actualDeath", label: "Total Deaths", value: totalDeathValue},
																				{ key: "dailyDeath", label: "Daily Deaths", value: dailyDeathValue},
																				{ key: "modelDeath", label: "Projected Total Deaths", value: modelDeathValue},
																				{ key: "modelDeathDaily", label: "Projected Daily Deaths", value: modelDeathDailyValue}
																		]}
																/>
												</div>
										 </div>
									</div>
							</div>
					);
				}
    }
}

function Header (){
	const classes = useStyles();
	return (
		<div className={classes.appWrapper}>
			<header>
				<h2>cv19.report</h2>
				<p>
					COVID-19 visualization & forecasting
				</p>
			</header>
		</div>
	);
}

function Footer (){
	const [stateName] = useState("US");
	const classes = useStyles();
	const imageOptions = {
		scale: .5,
		//encoderOptions: 1,
		backgroundColor: 'white',
	}
	const svgLocation = document.getElementsByTagName("svg")[1];
	function handleClick () {
		saveSvgAsPng.saveSvgAsPng(document.getElementsByTagName("svg")[1], `${stateName}-covid.png`, imageOptions);
	}
	return (
		<div className={classes.appWrapper}>
			<SimpleModal buttonLabel="About">
				<h2>COVID Data</h2>
				<p>
						This tool visualizes daily data from every US state (data from <a href="https://covidtracking.com/data" target="_blank">Covid Tracking Project</a> and creates a time series model forecasting the near term future for a given metric.
				</p>
				<p>
						Every state model is combined into a US model.
				</p>
				<p>
						Daily data is refreshed as soon as it's available, typically sometime after 4 PM EST.
				</p>
				<p>
					  The shaded areas represent the 5% and 95% confidence estimates from the model.  If a data point lies outside of this area it is unexpected and may represent a problem with source data or some unexpected sudden change.
				</p>
			</SimpleModal>
		</div>
	);
}

class App extends React.Component {
  state = {};

  render() {
    return (
      <div className="p-3 m-4 border border-muted">
			  <Header />
        <SimpleChart />
			  <Footer />
      </div>
    );
  }
}

export default App;
