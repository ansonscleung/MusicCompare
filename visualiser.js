

function drawResult(results, mainBPM, canvasId){

    console.log(canvasId);
    const canvas = document.getElementById(canvasId);

    canvas.style.width ='100%';
    canvas.width  = canvas.offsetWidth;
    var xCoef = canvas.width/results.length;
    var yCoef = 100;
    //canvas.width = 400;
    canvas.height = yCoef;
    const canvasCtx = canvas.getContext("2d");
    canvasCtx.strokeStyle = '#000000';
    var offset = canvas.height * calOffset(results[0], max, min);
    canvasCtx.moveTo(0, canvas.height-offset);

    var min = arrayMin(results);
    var max = arrayMax(results);

    var tmp = [];
    for (var i = 0 ; i < results.length ; i++){
        offset = canvas.height * calOffset(results[i], max, min);
        canvasCtx.lineTo( i * xCoef, canvas.height-offset);
        canvasCtx.stroke();
    }

    offset = canvas.height * calOffset(mainBPM, max, min);
    canvasCtx.moveTo(0,	canvas.height-offset);
    canvasCtx.lineTo(results.length*xCoef, canvas.height-offset);
    canvasCtx.stroke();
}

function calOffset(data, max, min){
    return (data - min) / (max - min);
}

function arrayMin(arr) {
    var len = arr.length,
        min = Infinity;
    while (len--) {
        if (arr[len] < min) {
            min = arr[len];
        }
    }
    return min;
}

function arrayMax(arr) {
    var len = arr.length,
        max = -Infinity;
    while (len--) {
        if (arr[len] > max) {
            max = arr[len];
        }
    }
    return max;
}
