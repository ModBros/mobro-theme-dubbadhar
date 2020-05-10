import { charts } from 'chart.js'
var bytes = require('bytes');
var convert = require('convert-units')


const settings = {
    min: 0,
    orange: 65,
    red: 80,
    max: 100
};

(function () {

    var hidden, visibilityChange;
    if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
        hidden = "hidden";
        visibilityChange = "visibilitychange";
    } else if (typeof document.msHidden !== "undefined") {
        hidden = "msHidden";
        visibilityChange = "msvisibilitychange";
    } else if (typeof document.webkitHidden !== "undefined") {
        hidden = "webkitHidden";
        visibilityChange = "webkitvisibilitychange";
    }

    function handleVisibilityChange() {
        if (!document[hidden]) {
            window.dispatchEvent(new Event('resize'));
            if(charts && Object.keys(charts).length){
                for (let [key] of Object.entries(charts)) {
                    if(charts[key]){
                        charts[key].update()
                    }
                }
            }
        }
    }

    document.addEventListener(visibilityChange, handleVisibilityChange, false);

    configureChartJS();

    let charts = {};

    MobroSDK.init().then(() => {

        const mobro_settings =  MobroSDK.helper.settings

        //could do that better some max vals could be wrong - please fix
        settings.min = mobro_settings.hardware.temperature[0].max
        settings.red = mobro_settings.hardware.temperature[0].critical
        settings.orange = mobro_settings.hardware.temperature[0].warning


        charts = initCharts();

        MobroSDK.addChannelListener('general_processor_temperature', (data) => {
            charts.cpuTemp.chart.data.datasets[0].data[0] = parseFloat(data.payload.value);
            charts.cpuTemp.chart.data.datasets[0].data[1] =  parseFloat(data.payload.value - settings.max);
            charts.cpuTemp.chart.update();
        });
        const cpuLoad = document.getElementById('cpu-current-load')
        MobroSDK.addChannelListener('general_processor_usage', (data) => {
            charts.cpuLoad.chart.data.datasets[0].data.push(parseInt(data.payload.value))
            charts.cpuLoad.chart.data.datasets[0].data.shift();

            cpuLoad.innerHTML = parseInt(data.payload.value);

            charts.cpuLoad.chart.config.data.labels.push(+ new Date())
            charts.cpuLoad.chart.config.data.labels.shift();

            charts.cpuLoad.chart.update();
        })



        MobroSDK.addChannelListener('general_graphics_temperature', (data) => {
            charts.gpuTemp.chart.data.datasets[0].data[0] = parseFloat(data.payload.value)
            charts.gpuTemp.chart.data.datasets[0].data[1] =  parseFloat(data.payload.value - settings.max)

            charts.gpuTemp.chart.update();
        })

        const gpuLoad = document.getElementById('gpu-current-load')
        MobroSDK.addChannelListener('general_graphics_usage', (data) => {
            charts.gpuLoad.chart.data.datasets[0].data.push(parseInt(data.payload.value))
            charts.gpuLoad.chart.data.datasets[0].data.shift();

            gpuLoad.innerHTML = parseInt(data.payload.value);

            charts.gpuLoad.chart.config.data.labels.push(+ new Date())
            charts.gpuLoad.chart.config.data.labels.shift();

            charts.gpuLoad.chart.update()
        })



        MobroSDK.addChannelListener('general_memory_usage', (data) => {
            charts.ramUsage.chart.data.datasets[0].data[0] = parseFloat(data.payload.value)
            charts.ramUsage.chart.data.datasets[0].data[1] =  parseFloat(100 - data.payload.value)

            charts.ramUsage.chart.update()
        })

        const memoryData = document.getElementById('mobro-ram-data--used')
        MobroSDK.addChannelListener('general_memory_used', (data) => {
            memoryData.innerHTML = convert(parseFloat(data.payload.value)).from(data.payload.unit).to('GB').toFixed(2);
        })


        MobroSDK.emit("monitor:hardware").then((data) => {
            document.getElementById("mobro-cpu-name").innerHTML = data.processor.cpus[0].name
            document.getElementById("mobro-gpu-name").innerHTML = data.graphics.gpus[0].name
            document.getElementById("mobro-ram-data--total").innerHTML = bytes(data.memory.totalcapacity)
        })

        MobroSDK.emit("monitor:sensor:data", "general_processor_temperature").then((data) => {
            //could prefill line graphs later on...
        })

        MobroSDK.emit("monitor:sensor:data", "theme_vram_total").then((data) => {
            if(!data.value || !data.unit){
                return;
            }

            document.getElementById("mobro-vram-data-total").innerHTML =
                convert(data.value).from(data.unit).to('GB').toFixed(0) + 'GB'
        })

        const cpuFan = document.getElementById("fan_cpu-chart-doughnut")
        MobroSDK.addChannelListener("theme_fan_speed_cpu", (data) => {
            if(data.payload && data.payload.sensortype){
                if(!charts.cpuFan){
                    charts.cpuFan = createClosedDoughnuts(document.getElementById("fan_cpu-chart-doughnut"))
                    cpuFan.style.display = 'block';
                }
                charts.cpuFan.chart.data.datasets[0].data[0] = parseFloat(data.payload.value)
                charts.cpuFan.chart.data.datasets[0].data[1] = parseFloat(data.payload.avg - data.payload.value)

                charts.cpuFan.chart.update()
            }else{
                cpuFan.style.display = 'none';
            }
        })

        const gpuFan = document.getElementById("fan_gpu-chart-doughnut")
        MobroSDK.addChannelListener("theme_fan_speed_gpu", (data) => {
            if(data.payload){
                if(!charts.gpuFan){
                    charts.gpuFan = createClosedDoughnuts(document.getElementById("fan_gpu-chart-doughnut"))
                    gpuFan.style.display = 'block';
                }
                charts.gpuFan.chart.data.datasets[0].data[0] = parseFloat(data.payload.value)
                charts.gpuFan.chart.data.datasets[0].data[1] = parseFloat(data.payload.avg - data.payload.value)

                charts.gpuFan.chart.update()
            }else{
                gpuFan.style.display = 'none';
            }
        })

        const vramData = document.getElementById("mobro-vram-data")
        MobroSDK.addChannelListener("theme_vram", (data) => {
            if(data.payload){
                vramData.style.display = 'inline-block';
                vramData.innerHTML = convert(data.payload.value).from(data.payload.unit).to('GB').toFixed(2)
            }else{
                vram.vramData.display = 'none';
            }
        })

        const vram = document.getElementById("vram-chart-doughnut")
        MobroSDK.addChannelListener("theme_vram_percentage", (data) => {
            if(data.payload){
                if(!charts.vramUsage){
                    charts.vramUsage = createDoughnuts(document.getElementById("vram-chart-doughnut"))
                    vram.style.display = 'block';
                }
                charts.vramUsage.chart.data.datasets[0].data[0] = parseFloat(data.payload.value)
                charts.vramUsage.chart.data.datasets[0].data[1] = parseFloat(100 - data.payload.value)

                charts.vramUsage.chart.update()

                // vramData.innerHTML =
            }else{
                vram.style.display = 'none';
            }
        })

    })
})()


function initCharts() {
    return {
        "cpuLoad" : createLine(document.getElementById("cpu-chart-line")),
        "cpuTemp" : createDoughnuts(document.getElementById("cpu-chart-doughnut")),

        "gpuLoad" : createLine(document.getElementById("gpu-chart-line")),
        "gpuTemp" : createDoughnuts(document.getElementById("gpu-chart-doughnut")),

        "ramUsage" : createDoughnuts(document.getElementById("ram-chart-doughnut")),
        "vramUsage" : null,

        "cpuFan" : null,
        "gpuFan" : null,
    }
}


function createDoughnuts(element) {
    const outlineDoughnutOptions = {
        responsive: true,
        cutoutPercentage: 75,
        circumference: 1.6 * Math.PI,
        rotation: -( 1.3 * Math.PI),
        breakpoints: {
            min: settings.min,
            orange: settings.orange,
            red: settings.red,
            max: settings.max
        }
    }

    return new Chart(element, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, 0],
                backgroundColor: [
                    'rgba(0, 255, 30, 1)',
                    'rgb(80,110,120)',
                ],
                borderWidth: 0
            }]
        },
        options: outlineDoughnutOptions,
    })
}

function createClosedDoughnuts(element) {
    const outlineDoughnutOptions = {
        cutoutPercentage: 75,
    }

    return new Chart(element, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [2, 1],
                backgroundColor: [
                    'rgba(0, 255, 255, 1)',
                    'rgb(80,110,120)',
                ],
                borderWidth: 0
            }]
        },
        options: outlineDoughnutOptions,
    })
}

function createLine(element,interpolate = false) {
    const animation = {
        duration: 750,
        easing: 'linear'
    };

    const lineOptions = {
        tooltips: {enabled: false},
        hover: {mode: null},
        animation: animation,
        cubicInterpolationMode : interpolate,
        responsive: true,
        scales: {
            xAxes: [{
                display: false, // mandatory
                scaleLabel: {
                    display: true, // mandatory
                    labelString: 'Your label' // optional
                },
            }],
            yAxes: [{
                display: true,
                gridLines: {
                    display: false,
                    drawBorder: false
                },
                ticks: {
                    mirror: true,
                }
            }]
        }
    }



    return new Chart(element, {
        type: 'line',
        data: {
            labels: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14],
            datasets: [{
                lineTension: 0,
                data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                borderColor: 'rgba(15, 150, 200, 1)',
                borderWidth: 2,
                pointRadius: '0',
                fill: false
            }]
        },
        options: lineOptions

    })
}


function configureChartJS() {

    Chart.defaults.global.legend.display = false;
    Chart.defaults.global.tooltips.enabled = false;
    Chart.defaults.global.hover.mode = null;

    Chart.pluginService.register({
        beforeDraw: function(chart) {
            var width = chart.chart.width,
                height = chart.chart.height,
                ctx = chart.chart.ctx,
                type = chart.config.type;


            if(type == 'line'){
                var min = Math.min(...chart.config.data.datasets[0].data);
                var max = Math.max(...chart.config.data.datasets[0].data);

                if( max - min >= 1){
                    chart.config.options.scales.yAxes[0].ticks.stepSize = max;
                    chart.config.options.scales.yAxes[0].ticks.max = max;
                    chart.config.options.scales.yAxes[0].ticks.min = min;
                }else{
                    chart.config.options.scales.yAxes[0].ticks.stepSize = max + 1;
                    chart.config.options.scales.yAxes[0].ticks.max = max + 1;
                    chart.config.options.scales.yAxes[0].ticks.min = Math.max(min, 0) ;
                }


                chart.update()
            }

            if (type == 'doughnut')
            {
                // var percent = Math.round((chart.config.data.datasets[0].data[0] * 100) /
                //     (chart.config.data.datasets[0].data[0] +
                //         chart.config.data.datasets[0].data[1]));

                let percent = chart.config.data.datasets[0].data[0]


                var oldFill = ctx.fillStyle;
                var fontSize = (height / 4 ).toFixed(2);

                ctx.restore();
                ctx.textBaseline = "middle"

                var value = percent%1 ? percent.toFixed(1) : percent;

                let textX = Math.round(width / 2),
                    textY = (height + chart.chartArea.top) / 2;

                ctx.font = fontSize/3 + "px sans-serif";
                ctx.fillStyle = "#FFF";

                ctx.textAlign = "center";

                let text_name = chart.canvas.getAttribute('data-name')
                ctx.fillText(text_name, Math.round(width / 2), textY - height/5)

                let text_unit = chart.canvas.getAttribute('data-unit')
                ctx.fillText(text_unit, Math.round(width / 2), textY + height/4)

                ctx.font = fontSize + "px sans-serif";
                ctx.fillStyle = chart.config.data.datasets[0].backgroundColor[0];
                ctx.textAlign = "center";
                ctx.fillText(value, textX, textY + height/30);
                ctx.fillStyle = oldFill;

                if(chart.canvas.getAttribute('data-border') === 'margins'){
                    if(percent < chart.config.options.breakpoints.orange){
                        chart.config.data.datasets[0].backgroundColor[0] = 'rgba(0, 255, 30, 1)'
                    }
                    if(percent > chart.config.options.breakpoints.orange){
                        chart.config.data.datasets[0].backgroundColor[0] = 'rgba(255, 255, 30, 1)'
                    }
                    if(percent > chart.config.options.breakpoints.red){
                        chart.config.data.datasets[0].backgroundColor[0] = 'rgba(255, 0, 0, 1)'
                    }
                }

                chart.update()
            }
        },
        afterDraw: function (chart) {
            var width = chart.chart.width,
                height = chart.chart.height,
                ctx = chart.chart.ctx,
                type = chart.config.type;

            if (type == 'doughnut' && chart.canvas.getAttribute('data-border') === 'margins' ) {

                let doughnutlenght = chart.chart.config.options.circumference;

                let lineWidth = chart.radiusLength / 4;
                ctx.lineWidth = lineWidth;

                //green path
                ctx.strokeStyle = "#00ff1e";
                ctx.beginPath();
                ctx.arc(width / 2, (height / 2) + height / 21.05, chart.chart.controller.outerRadius - lineWidth / 2, chart.chart.config.options.rotation, chart.chart.config.options.rotation + chart.chart.config.options.circumference * chart.chart.config.options.breakpoints.orange / 100 );
                ctx.stroke();

                //yellow path
                ctx.strokeStyle = "#FFFF00";
                ctx.beginPath();
                ctx.arc(width / 2, (height / 2) + height / 21.05, chart.chart.controller.outerRadius - lineWidth / 2, chart.chart.config.options.rotation + chart.chart.config.options.circumference * chart.chart.config.options.breakpoints.orange / 100, chart.chart.config.options.circumference * 0.10);
                ctx.stroke();

                //red path
                ctx.strokeStyle = "#FF0000";
                ctx.beginPath();
                ctx.arc(width / 2, (height / 2) + height / 21.05, chart.chart.controller.outerRadius - lineWidth / 2, chart.chart.config.options.rotation + chart.chart.config.options.circumference * chart.chart.config.options.breakpoints.red / 100, chart.chart.config.options.rotation + chart.chart.config.options.circumference );
                ctx.stroke();


                let spaceWidth = chart.radiusLength / 6;
                ctx.strokeStyle = "#000"; //red
                ctx.lineWidth = 4
                ctx.beginPath();
                ctx.arc(width / 2, (height / 2) + height / 21.05, chart.chart.controller.outerRadius - lineWidth / 2 - spaceWidth / 1.5, chart.chart.config.options.rotation, chart.chart.config.options.rotation + chart.chart.config.options.circumference);
                ctx.stroke();

                ctx.save();
            }
        }
    });

}