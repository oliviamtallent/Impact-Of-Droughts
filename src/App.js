import './App.css';
import React, { useState, useEffect } from 'react';
import * as d3 from "d3";
import Papa from "papaparse";
import csv_file from "./data/drought_index_data.csv"
import temp_file from "./data/tempurature_data.csv"
import ReactSlider from "react-slider";
import moment from 'moment'
import TabPage from './TabPage';

export const useMapTools = function () {
  const [mapData, setMapData] = useState({
    data: {},
    loading: true
  })

  const geoUrl = "https://raw.githubusercontent.com/oliviamtallent/ClimateAndDroughts/master/src/data/tx_counties.geojson";

  // fetch map once
  useEffect(() => {
    d3.json(geoUrl)
      .then((data) => {
        setMapData((prevState) => {
          return({...prevState, data: data, loading: false})
        })
      })
      .catch((err) => {
        console.log("map load error: ", err)
      })
  }, []);

  return { mapData };
}

export const fetchData = function () {
  const [droughtData, setDroughtData] = useState({
    data: {},
    loading: true
  })

   // parse csv file
   useEffect(() => {
    async function getData() {
      let response = await fetch(csv_file)
        .then(response => response.text())
        .then(text => {
          return text;
        })
     
      const results = Papa.parse(response, {
        header: true,
      });
      const rows = results.data;
      setDroughtData({data: rows, loading: false})
    }
    getData()
  }, [])

  return {droughtData}
}

export const fetchTempData = function () {
  const [tempData, setTempData] = useState({
    data: {},
    loading: true
  })

   // parse csv file
   useEffect(() => {
    async function getData() {
      let response = await fetch(temp_file)
        .then(response => response.text())
        .then(text => {
          return text;
        })
     
      const results = Papa.parse(response, {
        header: true,
      });
      const rows = results.data;
      setTempData({data: rows, loading: false})
    }
    getData()
  }, [])

  return {tempData}
}

function dateToString(dateNum) {
  if (dateNum == null) {return ""}

  const months = {
    '01':'January',
		'02':'February',
		'03':'March',
		'04':'April',
		'05':'May',
		'06':'June',
		'07':'July',
		'08':'August',
		'09':'September',
		'10':'October',
		'11':'November',
		'12':'December'	
  }
  let dateStr = dateNum.toString();
  return months[dateStr.substring(4,6)] + " " + dateStr.substring(6) + ", " + dateStr.substring(0, 4) 
}

export function MapRegion(props) {
  const colors = {
    0 : "#FFFFFF",
    50 : "#FDFBC7",
    100 : "#FFFA76",
    150 : "#FFF613",
    200 : "#FFCD6B",
    250 : "#FFBF44",
    300 : "#F19F63",
    350 : "#FA8729",
    400 : "#E8835D",
    450 : "#E11F13",
    500 : "#790700"
  }
  if (props.currentData.length != 0) {
    let item = props.currentData.filter(obj => { return obj.County == props.name})
    if (item.length != 0) {
      return (
        <path  
          className={"path"}
          d={props.path}
          strokeWidth={1}
          stroke={"#000000"}
          fill={colors[Math.round(parseInt(item[0].DSCI) / 50) * 50]}
        />
      )
    }
  }

  return (
    <path
      className={"path"}
      d={props.path}
      strokeWidth={1}
      stroke={"#000000"}
      fill={"#fff"}
    />
  )
}

export const setMapProjection = function mapData(mapData) {
  const projection = d3.geoAlbers().scale(400);
  projection
    .fitExtent([[0, 0], [960, 960]], mapData); 

  return projection;
}

function App() {
  const { mapData } = useMapTools();
  const { droughtData } = fetchData();
  const { tempData } = fetchTempData();

  const [date, setDate] = useState(null);
  const [avgTemp, setAvgTemp] = useState(null);
  const [avgDSCI, setAvgDSCI] = useState({rendered: false, val: null});
  const [currentData, setCurrentData] = useState([]);
  const [currentValue, setCurrentValue] = useState(0);
  const [playing, setPlaying] = useState(false)
  const [rendering, setRendering] = useState(false);
  const [tab1Click, setTab1Click] = useState(false);
  const [tab2Click, setTab2Click] = useState(false);
  const [tab3Click, setTab3Click] = useState(false);
  const [firstColorRender, setFirstColorRender] = useState(false);
  var sum = 0;

  useEffect(() => {
    if (!mapData.loading && !droughtData.loading) {
      const currentArr = droughtData.data.filter((val) => {
        return val.MapDate === date.toString()
      });
      setCurrentData(currentArr)
      setFirstColorRender(true);
      if (rendering) {
        setRendering(false);
        nextWeek({start: false});
      }
    }
  }, [date])

  const playSimluation = () => {
    setPlaying(true)
    nextWeek({start: true});
  }

  const nextWeek = (props) => {
    if (date != "20231003" && (playing || props.start)) {
      let newDate = moment(date,"YYYYMMDD").add(7,'days');
      setDate(newDate.format("YYYYMMDD"))
      setAvgDSCI(0)
      setAvgTemp(tempData.data.filter((item) => item.Date == newDate.format("YYYYMM"))[0].Value)
      setCurrentValue(currentValue + 1)
      setRendering(true);
    } else {
      setPlaying(false)
    }
  }

  if (!mapData.loading && !droughtData.loading && !tempData.loading) {
    if (date == null) {
      setAvgDSCI(0)
      setDate("20000104")
      setCurrentValue(1)
      setAvgTemp(tempData.data.filter((item) => item.Date == "200001")[0].Value)
    }
    let projection = d3.geoEquirectangular().center([-10, 5]).translate([3310,1125]).scale(1950);
    const path = d3.geoPath().projection(projection);

    const regions = mapData.data.features.map((data, i) => {
      const region_name = data.properties["COUNTY"];

      var dsci = 0;
      if (currentData.length != 0 && firstColorRender) {
        let item = currentData.filter(obj => { return obj.County == region_name})
        if (item.length != 0) {
          dsci = item[0].DSCI
          sum += parseInt(item[0].DSCI)
        }

        if (i == 253) {
          setFirstColorRender(false)
          setAvgDSCI(sum/254)
        }

        return (
          <MapRegion
            key={data.properties.FID} 
            name={region_name}
            currentData={currentData}
            path={path(data)}
            dsci={dsci}
          />
        )
      } else {
        return (
          <MapRegion
            key={data.properties.FID} 
            name={region_name}
            currentData={currentData}
            path={path(data)}
            dsci={0}
          />
        )
      }
    })
 
    return (
      <div className="App">
        <div style={{position: 'absolute', top: 25}}>
          <div className='tab' style={{ left: tab1Click ? 520 : 0, zIndex: tab1Click ? 10 : 'auto'}} onClick={() => {setTab1Click(!tab1Click)}}>
            <p className='tabText'>ABOUT</p>
            <TabPage top={-2}>
              <h3>Droughts and their Impact</h3>
              <p>Drought is defined as a lack of precipitation over extended periods resulting in a water shortage.</p>
              <div style={{display: 'flex', flexDirection: 'row'}}>
                <img width={150} height={150} src='https://npr.brightspotcdn.com/61/34/7b24210d425c86eb75905b7a035a/img-4741.jpg' />
                <div style={{marginLeft: '10px'}}>
                  <p>When the tempurature increases, water on the Earth's surface evaporates more quickly. This means that an overall increase in tempurature results in periods without percipitation being drier.</p>
                </div>
              </div>
              <p>Warming creates increased variability in weather patterns, making drier places drier, and wetter places wetter. This means that dry places are more susceptible to droughts and wet places are more susceptible to floods.</p>
              <p style={{textAlign: 'justify'}}>Increased tempuratures also result in decreased snowpack (snow that does not melt and stays on the ground), making those places even drier in the summers when the snowpack would usually melt.</p>
              <p style={{textAlign: 'justify'}}>This is also a cycle, as increased drought results in decreased plant cover and dry soils, which increases solar radiation and leads to increased high pressure weather systems and further supressing rainfall.</p>
            </TabPage>
          </div>
          <div className='tab' style={{ left: tab2Click ? 520 : 0, zIndex: tab2Click ? 10 : 'auto'}} onClick={() => {setTab2Click(!tab2Click)}}>
          <p className='tabText'>PREVENTION</p>
            <TabPage top={-130}>
            </TabPage>
          </div>
          <div className='tab' style={{ left: tab3Click ? 520 : 0, zIndex: tab3Click ? 10 : 'auto'}} onClick={() => {setTab3Click(!tab3Click)}}>
          <p className='tabText'>CREDITS</p>
            <TabPage top={-253}>
            </TabPage>
          </div>
        </div>
        <div>
          <h1>Texas Drought Data (by Week)</h1>
          <svg className={"map-canvas"} width={500} height={450}>
            <g>{regions}</g>
          </svg>
          <div className='info-bg'>
            <p>{"DSCI Avg: " + Math.round(avgDSCI * 10)/10}</p>
            <p>{"Average Temp: " + avgTemp}</p>
            <h3 style={{marginBottom: 0}}>Drought Index Key</h3>
            <div style={{display: 'flex', flexDirection: 'row', marginLeft: '10px'}}>
              <div style={{backgroundColor: "#FFFFFF"}} className='circle'>
                <p className='circleText'>0</p>
              </div>
              <div style={{backgroundColor: "#FDFBC7"}} className='circle'>
                <p className='circleText'>50</p>
              </div>
              <div style={{backgroundColor: "#FFFA76"}} className='circle'>
                <p className='circleText'>100</p>
              </div>
              <div style={{backgroundColor: "#FFF613"}} className='circle'>
                <p className='circleText'>150</p>
              </div>
            </div>
            <div style={{display: 'flex', flexDirection: 'row', marginLeft: '10px'}}>
              <div style={{backgroundColor: "#FFCD6B"}} className='circle'>
              <p className='circleText'>200</p>
              </div>
              <div style={{backgroundColor: "#FFBF44"}} className='circle'>
              <p className='circleText'>250</p>
              </div>
              <div style={{backgroundColor: "#F19F63"}} className='circle'>
              <p className='circleText'>300</p>
              </div>
              <div style={{backgroundColor: "#FA8729"}} className='circle'>
              <p className='circleText'>350</p>
              </div>
            </div>
            <div style={{display: 'flex', flexDirection: 'row', marginLeft: '10px'}}>
              <div style={{backgroundColor: "#E8835D"}} className='circle'>
              <p className='circleText'>400</p>
              </div>
              <div style={{backgroundColor: "#E11F13"}} className='circle'>
              <p className='circleText'>450</p>
              </div>
              <div style={{backgroundColor: "#790700"}} className='circle'>
              <p className='circleText'>500</p>
              </div>
            </div>
          </div>
          <div style={{flexDirection: 'row', justifyContent: 'center', display: 'flex'}}>
            <ReactSlider
              className='customSlider'
              trackClassName='customSlider-track'
              thumbClassName='customSlider-thumb'
              min={1} 
              max={1235}
              value={currentValue} 
              onAfterChange={(value) => {
                setCurrentValue(value)
                setAvgDSCI(0)
                let year = Math.floor(value / 52) + 2000;
                let week = (value % 52+1).toString()
                if (week < 10) {
                  week = "0" + week;
                }
                let date = moment(year.toString() + "W" + week);
                let formatted = date.add(1, 'days')
                setDate(formatted.format('YYYYMMDD'))
                setAvgTemp(tempData.data.filter((item) => item.Date == formatted.format("YYYYMM"))[0].Value)
              }}
            />
            <img  src={playing ? require('./pause.png') : require('./arrow.png')} className='playBtn' onClick={() => (!playing ? playSimluation() : setPlaying(false))}/>
          </div>
          <h2>
            {dateToString(date)}
          </h2>
        </div>
      </div>
    )
  } else {
    return (
      <div className="App">
        <h1>loading...</h1>
      </div>
    )
  }
}

export default App;
