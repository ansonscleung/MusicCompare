/*audio_file.onchange = function() {
  var file = this.files[0];
  var reader = new FileReader();
  var context = new(window.AudioContext || window.webkitAudioContext)();
  reader.onload = function() {
    context.decodeAudioData(reader.result, function(buffer) {
      prepare(buffer);
    });
  };
  reader.readAsArrayBuffer(file);
};*/

//https://stackoverflow.com/questions/30110701/how-can-i-use-js-webaudioapi-for-beat-detection/30112800


/*function start() {
    var file = audio_file.files[0];
    var reader = new FileReader();
    var context = new(window.AudioContext || window.webkitAudioContext)();

    source = context.createBufferSource();


    reader.onload = function() {
        context.decodeAudioData(reader.result).then(function(buffer){
            //context.decodeAudioData(reader.result, function(buffer) {
            info(file, buffer);
            prepare(buffer);

        });
    };
    reader.readAsArrayBuffer(file);
};*/

function info(file, buffer){
    console.log("name: " + file.name);
    console.log("length: " + buffer.length);
    console.log("duration: " + buffer.duration + "s");
    console.log("sampleRate: " + buffer.sampleRate);
}


async function prepare(buffer, file) {
    console.log("Called prepare.");

    var offlineContext = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
    var source = offlineContext.createBufferSource();
    source.buffer = buffer;
    var filter = offlineContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 200;
    source.connect(filter);
    filter.connect(offlineContext.destination);
    source.start(0);
    offlineContext.startRendering();
    offlineContext.oncomplete = function(e) {
        process(e, buffer.sampleRate).then(function(bpm){
            console.log(file + ": " + bpm);
            return bpm;
        });
    };
}

async function process(e, sampleRate) {
    console.log("Called process");
    var filteredBuffer = e.renderedBuffer;
    //If you want to analyze both channels, use the other channel later
    var data = filteredBuffer.getChannelData(0);
    var max = arrayMax(data);
    var min = arrayMin(data);
    //console.log("max,min  = " + max + " " + min);

    var threshold = min + (max - min) * .6;
    //console.log("threshold = " + threshold);
    var peaks = getPeaksAtThreshold(data, threshold, sampleRate);
    //console.log("peaks = " + peaks);

    var intervalCounts = countIntervalsBetweenNearbyPeaks(peaks);
    console.log("intervalCounts.length = " + intervalCounts.length);

    var tempoCounts = groupNeighborsByTempo(intervalCounts, sampleRate, 40, 208);
    tempoCounts.sort(function(a, b) {
        return b.count - a.count;
    });

    console.log("tempoCounts.length = " + tempoCounts.length);

    checkNumber(tempoCounts);

    if (tempoCounts.length) {
        //output.innerHTML = tempoCounts[0].tempo;
        //document.getElementById("output").textContent = tempoCounts[0].tempo;
        console.log(tempoCounts[0].tempo);
        return tempoCounts[0].tempo;
    } else return 0;
}

function checkNumber(data){

    for (var i = 0; i < data.length; i++)

        console.log("here are " + data[i].count + " of " + data[i].tempo );

}


// http://tech.beatport.com/2014/web-audio/beat-detection-using-web-audio/
function getPeaksAtThreshold(data, threshold, sampleRate) {
    console.log("Called getPeaksAtThreshold with threshold " + threshold);
    var peaksArray = [];
    var length = data.length;
    for (var i = 0; i < length;) {
        if (data[i] > threshold) {
            peaksArray.push(i);
            // Skip forward ~ 1/4s to get past this peak.
            i += sampleRate/4;
        }
        i++;
    }
    return peaksArray;
}

function countIntervalsBetweenNearbyPeaks(peaks) {
    console.log("Called countIntervalsBetweenNearbyPeaks");
    var intervalCounts = [];
    peaks.forEach(function(peak, index) {
        for (var i = 0; i < 10; i++) {
            var interval = peaks[index + i] - peak;
            var foundInterval = intervalCounts.some(function(intervalCount) {
                if (intervalCount.interval === interval) return intervalCount.count++;
            });
            //Additional checks to avoid infinite loops in later processing
            if (!isNaN(interval) && interval !== 0 && !foundInterval) {
                intervalCounts.push({
                    interval: interval,
                    count: 1
                });
            }
        }
    });
    return intervalCounts;
}

function groupNeighborsByTempo(intervalCounts, sampleRate ) {
    console.log("Called groupNeighborsByTempo(intervalCounts, "+sampleRate+")");
    var tempoCounts = [];
    intervalCounts.forEach(function(intervalCount) {
        //Convert an interval to tempo
        var theoreticalTempo = 60 / (intervalCount.interval / sampleRate);

        theoreticalTempo = Math.round(theoreticalTempo);
        //console.log("theoreticalTempo, interval: " + theoreticalTempo + ", " + intervalCount.interval);



        if (theoreticalTempo === 0) {
            return;
        }
        // Adjust the tempo to fit within the 90-180 BPM range
        while (theoreticalTempo <= 40) theoreticalTempo *= 2;
        while (theoreticalTempo >= 208) theoreticalTempo /= 2;

        var foundTempo = tempoCounts.some(function(tempoCount) {
            if (tempoCount.tempo === theoreticalTempo) return tempoCount.count += intervalCount.count;
        });
        if (!foundTempo) {
            tempoCounts.push({
                tempo: theoreticalTempo,
                count: intervalCount.count
            });
        }
    });
    return tempoCounts;
}

// http://stackoverflow.com/questions/1669190/javascript-min-max-array-values
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
