import React, { useState, useEffect } from "react";
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

const f = format(",");

function getLast(res) {
	let lastDeath, lastICU, lastHospitalizedCurrently, lastPositiveIncrease;
	for (var value of res) {
		if (value.deathIncrease) {
			lastDeath = value.deathIncrease;
		}
		if (value.inIcuCurrently) {
			lastICU = value.inIcuCurrently;
		}
		if (value.hospitalizedCurrently) {
			lastHospitalizedCurrently = value.hospitalizedCurrently;
		}
		if (value.positiveIncrease) {
			lastPositiveIncrease= value.positiveIncrease;
		}
	}
	return [lastDeath, lastICU, lastHospitalizedCurrently, lastPositiveIncrease]
}

function setQueryParams(value) {
	if (value === "US") {
		window.history.pushState(null, null, '/')
	} else {
		window.history.pushState(null, null, `/${value}`)
	}
}

function CrossHairs(props) {
			const { x, y } = props;
			const style = { pointerEvents: "none", stroke: "#ccc" };
			if (!_.isNull(x) && !_.isNull(y)) {
					return (
							<g>
									<line style={style} x1={0} y1={y} x2={props.width} y2={y} />
									<line style={style} x1={x} y1={0} x2={x} y2={props.height} />
							</g>
					);
			} else {
					return <g />;
			}
}

function SimpleChart(props) {

	let stateValue = window.location.pathname.split('/')[1].toUpperCase();
	if (!stateValue) {
		// Cover old format
		let params = (new URL(document.location)).searchParams;
		stateValue = params.get("state");
		console.log(stateValue);
		if (!stateValue) {
			stateValue = "US"
		}
	}

	const [stateCode, setStateCode] = useState(stateValue);
	const [stateName, setStateName] = useState(null);
	const [data, setData] = useState([]);
	const [states, setStates] = useState([]);
	const [isLoaded, setIsLoaded] = useState(false);
	const [actualDeathIncreaseLatest, setActualDeathIncreaseLatest] = useState(null);
	const [inIcuCurrentlyLatest, setInIcuCurrentlyLatest] = useState(null); 
	const [hospitalizedCurrentlyLatest, setHospitalizedCurrentlyLatest] = useState(null);
	const [positiveIncreaseLatest, setPositiveIncreaseLatest] = useState(null);
	const [error, setError] = useState();
	const handleSchemeChange = async ({ value }) => {
		let selectedState = states.find(state => state.value === value);
		setStateCode(value);
		if (selectedState) {
			setStateName(selectedState.label);
		}
		
		await fetch(`${apiUrl}${value.toLowerCase()}.json`)
			.then(res => res.json())
			.then(
				(result) => {
					let lastRes;
					lastRes = getLast(result)
					setData(result);
					setActualDeathIncreaseLatest(lastRes[0]);
					setInIcuCurrentlyLatest(lastRes[1]);
					setHospitalizedCurrentlyLatest(lastRes[2]);
					setPositiveIncreaseLatest(lastRes[3]);
				},
				(error) => {
					setError(error);
				}
			)
			.then(
				setQueryParams(value)
			)
	};

	const fetchData = async () => {
		await fetch(`${apiUrl}states.json`)
		    .then(res => res.json())
				.then(
					(result) => {
						setStates(result);
					},
					(error) => {
						setError(error);
					}
				)
		await handleSchemeChange({value: stateCode})
		setIsLoaded(true);
	}


	useEffect(() => {
		fetchData();
	}, []);

	let series = new TimeSeries({
		name: "series",
		columns: [
			"index", 
			"death", "model_death", "model_death_error",
			"deathIncrease", "model_deathIncrease", "model_deathIncrease_error",
			"inIcuCurrently", "model_inIcuCurrently", "model_inIcuCurrently_error",
			"hospitalizedCurrently", "model_hospitalizedCurrently", "model_hospitalizedCurrently_error",
			"positiveIncrease", "model_positiveIncrease", "model_positiveIncrease_error",
		],
		points: data.map(({ 
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

	const hospitalizedCurrentlyLatestFormatted = isNaN(hospitalizedCurrentlyLatest) ? 'N/A': f(hospitalizedCurrentlyLatest);
	const inIcuCurrentlyLatestFormatted = isNaN(inIcuCurrentlyLatest) ? 'N/A': f(inIcuCurrentlyLatest);
	const actualDeathIncreaseLatestFormatted = isNaN(actualDeathIncreaseLatest) ? 'N/A': f(actualDeathIncreaseLatest);
	const positiveIncreaseLatestFormatted = isNaN(positiveIncreaseLatest) ? 'N/A': f(positiveIncreaseLatest);


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
												value={states.find(state => state.value === stateCode)}
												onChange={value => handleSchemeChange(value)}
										/>
								</div>
						</div>
						<hr />
				<DualChart
					series={series}
					title={`${stateCode} - ${f(series.max("death"))} (${actualDeathIncreaseLatestFormatted} last 24 hrs)`}
					leftLabel="Deaths"
					leftData="death"
					leftModel="model_death"
					leftError="model_death_error"
					leftDataValueDefault={`${f(series.max("death"))}`}
					rightLabel="Death Increase"
					rightData="deathIncrease"
					rightModel="model_deathIncrease"
					rightError="model_deathIncrease_error"
					rightDataValueDefault={`${actualDeathIncreaseLatestFormatted}`}
					/>
				<DualChart
					series={series}
					title={`${stateCode} - ${positiveIncreaseLatestFormatted} New Pos. Tests`}
					leftLabel="New cases (24 hrs)"
					leftData="positiveIncrease"
					leftModel="model_positiveIncrease"
					leftError="model_positiveIncrease_error"
					leftDataValueDefault={`${positiveIncreaseLatestFormatted}`}
					rightLabel={null}
					rightData="none"
					rightError="model_deathIncrease_error"
					rightDataValueDefault={`${actualDeathIncreaseLatestFormatted}`}
				/>
				<DualChart
					series={series}
					title={`${stateCode} - ${hospitalizedCurrentlyLatestFormatted} Hosp., ${inIcuCurrentlyLatestFormatted} ICU`}
					leftLabel="Hospitalized"
					leftData="hospitalizedCurrently"
					leftModel="model_hospitalizedCurrently"
					leftError="model_hospitalizedCurrently_error"
					leftDataValueDefault={`${hospitalizedCurrentlyLatestFormatted}`}
					rightLabel="ICU"
					rightData="inIcuCurrently"
					rightModel="model_inIcuCurrently"
					rightError="model_inIcuCurrently_error"
					rightDataValueDefault={`${inIcuCurrentlyLatestFormatted}`}
				/>
			</div>
		);
	}
}

function DualChart(props){
	const { 
		series,
		title,
		leftLabel,
		leftData,
		leftModel,
		leftError,
		leftDataValueDefault,
		rightLabel,
		rightData,
		rightModel,
		rightError,
		rightDataValueDefault,
	} = props;

	const [x, setX] = useState(null);
	const [y, setY] = useState(null);

	const [highlight, setHightlight] = useState(null);
	const [selection, setSelection] = useState(null);

	const [tracker, setTracker] = useState(null);

	const [timerange, setTimerange] = useState(null);
	if (timerange === null){
		setTimerange(series.range());
	}
	
	const handleTrackerChanged = tracker => {
			if (!tracker) {
				setTracker(tracker);
				setX(null);
				setY(null);
			} else {
				setTracker(tracker);
			}
	};

	const handleTimeRangeChange = timerange => {
		setTimerange(timerange);
	};

	const handleMouseMove = (x, y) => {
		setX(x);
		setY(y);
	};

	
	let rightDataValue, leftDataValue, rightModelValue, leftModelValue;
	if (tracker) {
		const seriesIndex = series.bisect(tracker);
		const seriesTrackerEvent = series.at(seriesIndex);
		if (seriesTrackerEvent.get(leftData)) {
			leftDataValue = `${f(seriesTrackerEvent.get(leftData))}`;
		};
		if (seriesTrackerEvent.get(leftModel)) {
			leftModelValue = `${f(parseInt(seriesTrackerEvent.get(leftModel), 10))}`;
		};
		if (seriesTrackerEvent.get(rightData)) {
			rightDataValue = `${f(seriesTrackerEvent.get(rightData))}`;
		};
		if (seriesTrackerEvent.get(rightModel)) {
			rightModelValue = `${f(parseInt(seriesTrackerEvent.get(rightModel), 10))}`;
		};
	} else {
		rightDataValue = rightDataValueDefault === 'NaN' ? '' : rightDataValueDefault;
		leftDataValue = leftDataValueDefault === 'NaN' ? '' : leftDataValueDefault;
	}

	const style = styler([
		{ key: leftError, color: "red", width: 1, opacity: 1 },
		{ key: leftModel, color: "red", width: 1, dashed: true},
		{ key: leftData, color: "red", width: 2},
		{ key: rightError, color: "steelblue", width: 1, opacity: 1 },
		{ key: rightModel, color: "blue", width: 1, dashed: true},
		{ key: rightData, color: "blue", width: 2},
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
				{key: "leftData", color: "red", width: 4},
				{key: "rightData", color: "blue", width: 4},
				{key: "leftModel", color: "red", width: 2, dashed: true},
				{key: "rightModel", color: "blue", width: 2, dashed: true}
		]);

	return(
		<div className="row">
				<div className="row">
						{leftLabel &&
						    <div className="col-sm">
								<Legend
									type="line"
									align="right"
									style={legendStyle}
									categories={[
										{ key: "leftData", label: leftLabel, value: leftDataValue === NaN ? '' : leftDataValue},
										{ key: "leftModel", label: "Projected " + leftLabel, value: leftModelValue === NaN ? '' : leftModelValue},
									]}
								/>
							</div>
						}
						{rightLabel &&
							<div className="col-sm">
								<Legend
									type="line"
									align="right"
									style={legendStyle}
									categories={[
										{ key: "rightData", label: rightLabel, value: rightDataValue === NaN ? '' : rightDataValue},
										{ key: "rightModel", label: "Projected " + rightLabel, value: rightModelValue === NaN ? '' : rightModelValue},
									]}
								/>
							</div>
						}
			    </div>
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
							onTrackerChanged={handleTrackerChanged}
							onTimeRangeChanged={handleTimeRangeChange}
							onMouseMove={(x, y) => handleMouseMove(x, y)}
							minDuration={1000 * 60 * 60 * 24 * 30}
							title={title}
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
									id="leftAxis"
									label={leftLabel}
									min={0}
									max={_.max([series.max(leftModel), series.max(leftData)])}
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
									axis="rightAxis"
									style={style}
									spacing={1}
									column={rightError}
									interpolation="curveBasis"
									series={series}
								/>
								<LineChart
									axis="rightAxis"
									style={style}
									spacing={1}
									columns={[rightData, rightModel]}
									interpolation="curveBasis"
									series={series}
								/>
								<BandChart
									axis="leftAxis"
									style={style}
									spacing={1}
									column={leftError}
									interpolation="curveBasis"
									series={series}
								/>
								<LineChart
									axis="leftAxis"
									style={style}
									spacing={1}
									columns={[leftData, leftModel]}
									interpolation="curveBasis"
									series={series}
								/>
								<CrossHairs x={x} y={y} />
							</Charts>
								<YAxis
										id="rightAxis"
										label={rightLabel}
										min={0}
										max={_.max([series.max(rightModel), series.max(rightData)])}
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
		</div>
	)
}


function Header (){
	const classes = useStyles();
	return (
		<div className={classes.appWrapper}>
			<header>
				<div className="col-sm">
					<h2>cv19.report</h2>
					<p>
						COVID-19 forecasting
					</p>
				</div>
				<div className="float-right">
				<div className="float-right">
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
						<p>
							Developed by Alex Young - <a href="https://github.com/sponsors/alexanderyoung" target="_blank">Support on GitHub</a> - <a href="https://support.cv19.report" target="_blank">Get updates</a>
						</p>
					</SimpleModal>
				</div>
				</div>
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
			<div className="footer-buttons">
				<a href="https://support.cv19.report" target="_blank"><button type="button" className="modalButton-0-2-3">Get Updates</button></a>
				<a href="https://github.com/sponsors/alexanderyoung" target="_blank"><button type="button" className="modalButton-0-2-3">Support</button></a>
				<a href="https://github.com/alexanderyoung/cv19-report" target="_blank"><button type="button" className="modalButton-0-2-3">GitHub</button></a>
			</div>
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
