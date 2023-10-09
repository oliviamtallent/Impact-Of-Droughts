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

  const geoUrl = "https://raw.githubusercontent.com/oliviamtallent/Impact-Of-Droughts/main/src/data/tx_counties.geojson";

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

const fetchData = () => {
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

const fetchTempData = () => {
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
  const [tab4Click, setTab4Click] = useState(false);
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
          <div className='tab' style={{ left: tab4Click ? 500 : 0, zIndex: tab4Click ? 10 : 'auto'}} onClick={() => {setTab4Click(!tab4Click)}}>
            <p className='tabText'>OVERVIEW</p>
            <TabPage top={-2}>
              <div style={{'marginRight':'20px'}}>
                <h2 class="intro-text">Overview</h2>
    
                <div id="top-breakfast">
                  <img class='img-style' src={require("./droughts-home.jpg")} alt="Image of a dry Landscape" />
                  <div class="main-food-desc">
                    <h2>Effects</h2>
                    <p style={{'marginTop':'10px'}}>
                      Climate change and a lack of rainfall, can increase the chances and the severity of a drought, and droughts some with their own problems as well, such as water restrictions, lack of water for agriculture uses, etc.
                      Another example is that if the snow melts too fast and too early, then there will be a rush of water in the existing water mangenment systems, and that the ground will become more thristy faster and sooner.
                    </p>
                  </div>
                </div>
                <div id="top-lunch">
                  <img
                    class='img-style'
                    src={require("./sustainability-home.jpg")}
                    alt="Image of half green grass and half dead patch"
                  />
                  <div class="main-food-desc">
                    <h2>Sustainable Choices</h2>
                    <p style={{'marginTop':'10px'}}>
                      Now knowing all the effects that climate change and lack of rainfall contributes to droughts, it's time to learn what sustainable choices an average person can make to decrease the impact of a drought.
                      When a lot of people do something small, it grows quickly to have a larger effect to a cause, in this case a drought. There are many things you can do to decrease the effect of a drought such as implementing water restriction, lowering landscape watering times, saving water wherever possible, etc.
                    </p>
                  </div>
                </div>
              </div>
            </TabPage>
          </div>
          <div className='tab' style={{ left: tab1Click ? 500 : 0, zIndex: tab1Click ? 10 : 'auto'}} onClick={() => {setTab1Click(!tab1Click)}}>
            <p className='tabText'>CAUSES</p>
            <TabPage top={-130}>
              <div style={{'marginRight': '10px'}}>
                <h3>Causes of Drought</h3>
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
              </div>
            </TabPage>
          </div>
          <div className='tab' style={{ left: tab2Click ? 500 : 0, zIndex: tab2Click ? 10 : 'auto'}} onClick={() => {setTab2Click(!tab2Click)}}>
          <p className='tabText'>PREVENTION</p>
            <TabPage top={-253}>
            <div style={{ 'overflow': 'auto', 'height': 550, 'marginRight': '10px'}}>
              <h2 class="intro-text">Sustainable Choices</h2>
              <div>
                <img class="img-style" src={require("./staircase-sustainability.jpg")} alt="Side view of a wooden staircase" />
                <div class="main-food-desc" style={{'padding-bottom': '8%'}}>
                  <h2>Small but Strong Steps</h2>
                  <p>
                    When there is a lot of people each doing something small to the environment, in this case trying to prevent droughts and lessen the effects of droughts, the effects can add up fast.
                  </p>
                </div>
              </div>

              <div class="main-food-desc">
                <h3>Indoor Water Conservative Tips</h3>
                <h4>General</h4>
                <ul>
                  <li>Don't waste water whenever you don't need it, there might be another use for it such as watering the plants.</li>
                  <li>Making sure you home is leak-free is very important because this could save you a lot of money if there is a water leak.</li>
                </ul>
                <h4>Bathroom</h4>
                <ul>
                  <li>Taking short showers and avoiding bubble baths is small step in the right direction because there are moments where you are justing wasting water without using it.</li>
                  <li>Don't leave taps running when there is no use of them since you aren't using the water and it's all going to waste.</li>
                </ul>
                <h4>Kitchen</h4>
                <ul>
                  <li>Only use dishwashers when they are full, and most dishwashers nowadays are good at cleaning soil, so you don't have to prewash them.</li>
                  <li>Don't use running water to defrost/thaw meat or frozen foods, instead leave them overnight or use the defrost option in you microwave.</li>
                </ul>
                <h4>Laundry</h4>
                <ul>
                  <li>Only wash clothes when the washer is full, so you don't waste water by turning on the washing machine multiple times when it's not required.</li>
                </ul>
                <h3>Outdoor Water Conservative Tips</h3>
                <h4>General</h4>
                <ul>
                  <li>Try to minimize the amount of time spent washing you car, and only wash when it's required.</li>
                </ul>
                <h4>Lawn Care</h4>
                <ul>
                  <li>Water the lawn in shorter periods but multiple times, rather than a long watering session.</li>
                  <li>Cut the grass to the highest level in the lawn mover, which promotes root growth and is better at holding water in the soil.</li>
                  <li>Check the sprinkers so that they are only watering to the lawn, and not paved surfaces.</li>
                  <li>Set a timer whenever you are using manual sprinkers so that you don't forget to off them.</li>
                </ul>
                <h4>Pools</h4>
                <ul>
                  <li>Covering pools and spa, will help decrease the amount of water lost to evaporation</li>
                </ul>
                <h4>Long Term Outdoor Conservation</h4>
                <ul>
                  <li>Planting native plants, and drought resistant grass will help you decrease some of the water usage and decrease your water bill.</li>
                  <li>Using mulch will help the soil hold some of the mositure in and decrease weeds from popping out.</li>
                </ul>
                <h4>In the Community</h4>
                <ul>
                  <li>Participating in community water conservative meetings will help you know what to do to save more water and whether the water restriction level changed.</li>
                  <li>Stay up-to-date with local water usages because there might be some rules preventing you from doing a certain task at a certain time.</li>
                </ul>
              </div>
            </div>
            </TabPage>
          </div>
          <div className='tab' style={{ left: tab3Click ? 500 : 0, zIndex: tab3Click ? 10 : 'auto'}} onClick={() => {setTab3Click(!tab3Click)}}>
          <p className='tabText'>CREDITS</p>
            <TabPage top={-386}>
              <div style={{'marginRight': '20px'}}>
                <ul>
                  <h2>Images</h2>
                  <li>
                    The picture of a <a href="https://unsplash.com/photos/HxxmKwvUbgI" target="_blank" class="link">drought</a> and <a href="https://unsplash.com/photos/XsAz9Mq61XY" target="_blank" class="link">green grass</a> in the main page is from Unplash.
                  </li>
                  <li>Texas head map is from <a href="https://youtu.be/qSvpgFyCpK8?si=fjWuk-mM-YXQkafL" target="_blank" class="link">Someka</a></li>
                  <li>Staircase image is from <a href="https://www.istockphoto.com/vector/brown-staircase-and-arrow-sign-instead-of-top-step-gm1251369401-365181618" target="_blank" class="link">iStock Photo</a></li>
                  <li>Drought land image is from <a href="https://npr.brightspotcdn.com/61/34/7b24210d425c86eb75905b7a035a/img-4741.jpg" target="_blank" class="link">NPR</a></li>
                  <br />
                  <h2>Information Sources</h2>
                  <li>
                    Sustainability choices to reduce the effect of droughts are from <a href="https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/drought.html" target="_blank" class="link">American Red Cross</a>
                  </li>
                  <li>Information about the causes of drought are from <a href="https://www.c2es.org/content/drought-and-climate-change/" target="_blank" class="link">Center for Climate and Energy Solutions</a></li>
                  <h2>Data Sources</h2>
                  <li>Texas Drought Data Archive: <a href="https://droughtmonitor.unl.edu/DmData/DataDownload/DSCI.aspx" target="_blank" class="link">U.S. Drought Monitor</a></li>
                  <li>Texas Monthly Tempurature Archive: <a href="https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/statewide/time-series/41/tmax/all/1/2000-2023?base_prd=true&begbaseyear=1901&endbaseyear=2000" target="_blank" class="link">National Centers for Enviornmental Information</a></li>
                  </ul>
              </div>
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
