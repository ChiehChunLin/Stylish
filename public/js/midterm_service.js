if(window.location.href.includes("/mid/dashboard")){
    fetchColorForPiePlot();
    fetchPriceForHistogram();
    fetchTopSizeForBarChart();
	
}

function fetchColorForPiePlot(){
    try {
        fetch("/api/1.0/mid/piePlot")
        .then(checkStatus)
        .then(checkResponse)
        .then((pieData) => {
          if (pieData) {
            // console.log(pieData);
            var data = [
              {
                values: pieData.values,   
                labels: pieData.labels,     
                type: 'pie',
                marker: {
                  colors: pieData.color_codes
                }   
              }
            ];                 
            var layout = {     
              height: 400,      
              width: 500      
            };        
            Plotly.newPlot('myPiePlot', data, layout);
          }
        })
        .catch((err) => {
          console.error("fetch error:", err);
        });
    } catch (err) {
        console.error("fetch error:", err);
    }
}
function fetchPriceForHistogram(){
  try {
    fetch("/api/1.0/mid/histgram")
    .then(checkStatus)
    .then(checkResponse)
    .then((histData) => {
      if (histData) {
        // console.log(histData);
        var trace1 = {
          x: histData.prices,
          type: "histogram",
        };
        
        var data = [trace1];
        var layout = {barmode: "stack"};
        Plotly.newPlot('myHistogram', data, layout);
      }
    })
    .catch((err) => {
      console.error("fetch error:", err);
    });
} catch (err) {
    console.error("fetch error:", err);
}
}
function fetchTopSizeForBarChart(){
  try {
    fetch("/api/1.0/mid/barChart")
    .then(checkStatus)
    .then(checkResponse)
    .then((barData) => {
      if (barData) {
        console.log(barData);
        var trace1 = {
          x: barData.title,
          y: barData.S,
          name: 'S',
          type: 'bar'
        };
        
        var trace2 = {
          x: barData.title,
          y: barData.M,
          name: 'M',
          type: 'bar'
        };
        var trace3 = {
          x: barData.title,
          y: barData.L,
          name: 'L',
          type: 'bar'
        };
        var data = [trace1, trace2,trace3];        
        var layout = {barmode: 'stack'};        
        Plotly.newPlot('myBarChart', data, layout);
      }
    })
    .catch((err) => {
      console.error("fetch error:", err);
    });
} catch (err) {
    console.error("fetch error:", err);
}
}