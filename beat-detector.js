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


async function prepare(buffer, file, sampleBPM, range, cutoff, filterFrequency) {
    //console.log("Called prepare.");

    var offlineContext = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
    var source = offlineContext.createBufferSource();
    var filter = offlineContext.createBiquadFilter();

    //create buffer and filter
    source.buffer = buffer;
    filter.type = "lowpass";

    //frequency for low pass filter *
    filter.frequency.value = filterFrequency;

    source.connect(filter);
    filter.connect(offlineContext.destination);
    source.start(0);

    //render the filtered audio and then process
    offlineContext.startRendering();
    offlineContext.oncomplete = function(e) {
        var minBPM = sampleBPM - range;
        var maxBPM = sampleBPM + range;
        process(e, buffer.sampleRate, minBPM, maxBPM, cutoff).then(function(bpmInfo){
            console.log(file + ": " + bpmInfo[0] + "+-" + bpmInfo[1]);
            $(file).text(bpmInfo[0] + "+-" + bpmInfo[1].toFixed(2));
            $(file).parent().removeClass("d-none");
            bpmTable.push(bpmInfo);
            bpmCalc(bpmTable);
            //return bpm;
        });
    };
}

async function process(e, sampleRate, minBPM, maxBPM, cutoff) {
    console.log("Called process");
    var filteredBuffer = e.renderedBuffer;
    //can use the other channel for analyse both channel
    //find the max and min of waveform and calculate threshold for peak tracking
    var data = filteredBuffer.getChannelData(0);
    var max = arrayMax(data);
    var min = arrayMin(data);
    //console.log("max,min  = " + max + " " + min);

    var threshold = percentile(data, 0.75);//min + (max - min) * cutoff;
    //console.log("threshold = " + threshold);
    var peaks = getPeaksAtThreshold(data, threshold, sampleRate);
    //console.log("peaks = " + peaks);

    //calculate intervals from peaks
    var intervalCounts = countIntervalsBetweenNearbyPeaks(peaks);
    console.log("intervalCounts.length = " + intervalCounts.length);

    var tempoCounts = groupNeighborsByTempo(intervalCounts, sampleRate, minBPM, maxBPM);
    tempoCounts.sort(function(a, b) {
        return b.count - a.count;
    });

    //checkNumber(tempoCounts);

    if (tempoCounts.length) {
        //output the most frequent tempo detected
        mainBPM = tempoCounts[0].tempo;
        //document.getElementById("output").textContent = mainBPM;
        console.log("The BPM is " + mainBPM);

        console.log("Start partial analysis");
        // period = beat of a metre, perhaps get from midi
        // periodTime = time of a period
        // processCount = total subprocess will be done
        //

        var period = 4 * 8;
        var periodTime = Math.floor(period * (60 / mainBPM));
        var processCount = (filteredBuffer.length / sampleRate) / periodTime;

        /*
		var results = [];
		for (var time = 0 ; time < processCount ; time++){
			var subData = getSubDataFromBuffer(data, sampleRate, time, periodTime);
			var partialResult = subProcess(subData, sampleRate, minBPM, maxBPM, cutoff, time);
			results.push(partialResult);
		}
		*/
        var results = [];
        for (var time = 0 ; time < processCount * 2 - 1 ; time++){
            var subData = getSubDataFromBuffer(data, sampleRate, time, periodTime);
            var partialResult = subProcess(subData, sampleRate, minBPM, maxBPM, cutoff, time);
            results.push(partialResult);
        }
        console.log("The subprocess result is " + results);
        var rms = rmsError(mainBPM, results);
        console.log("The RMS error is " + rms);
        return [mainBPM, rms];
    }
    else console.log("Error: no result is formed.");
}

function getSubDataFromBuffer(filteredData, sampleRate, trial, periodTime){
    var audioCtx = new(window.AudioContext || window.webkitAudioContext)();
    var subDataArrayBuffer = audioCtx.createBuffer(1, periodTime * sampleRate, sampleRate);
    var startOffset = periodTime * sampleRate * Math.floor( trial / 2) ;

    var subDataArrayBufferChannelData = subDataArrayBuffer.getChannelData(0);
    for (var i = 0 ; i < periodTime * sampleRate ; i++) {
        subDataArrayBufferChannelData[i] = filteredData[startOffset + i];
    }
    return subDataArrayBufferChannelData;
}

function subProcess(subData, sampleRate, minBPM, maxBPM, cutoff, trial) {
    //console.log("Called subProcess " + trial);

    var max = arrayMax(subData);
    var min = arrayMin(subData);
    //console.log("max,min  = " + max + " " + min);
    var threshold = percentile(subData, 0.75);//min + (max - min) * cutoff;
    var peaks = getPeaksAtThreshold(subData, threshold, sampleRate);

    var intervalCounts = countIntervalsBetweenNearbyPeaks(peaks);
    //console.log("intervalCounts.length = " + intervalCounts.length);

    var tempoCounts = groupNeighborsByTempo(intervalCounts, sampleRate, minBPM, maxBPM);
    tempoCounts.sort(function(a, b) {
        return b.count - a.count;
    });
    if (tempoCounts.length) {
        //console.log("The BPM of trial " + trial + " is " + tempoCounts[0].tempo);
        return tempoCounts[0].tempo;
    }
    return -1;
}

function rmsError(mainBPM, results){
    var sum = 0;
    for (var i = 0; i < results.length ; i++){
        if (results[i] != -1)
            sum += (results[i] - mainBPM)*(results[i] - mainBPM);
    }
    return Math.sqrt(sum/(results.length - 2));
}


// http://tech.beatport.com/2014/web-audio/beat-detection-using-web-audio/
function getPeaksAtThreshold(data, threshold, sampleRate) {
    //console.log("Called getPeaksAtThreshold with threshold :" + threshold);
    var peaksArray = [];
    var length = data.length;
    //find peak that higher than threshold
    //for each peak found, skip for .25 second to skip the current peak
    for (var i = 0; i < length;i++) {
        if (data[i] > threshold) {
            peaksArray.push(i);
            i += sampleRate/4;
        }
    }
    return peaksArray;
}

function countIntervalsBetweenNearbyPeaks(peaks) {
    //console.log("Called countIntervalsBetweenNearbyPeaks");
    var intervalCounts = [];
    peaks.forEach(function(peak, index) {
        for (var i = 0; i < 10; i++) {
            var interval = peaks[index + i] - peak;
            var foundInterval = intervalCounts.some(function(intervalCount) {
                if (intervalCount.interval === interval)
                    return intervalCount.count++;
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

function groupNeighborsByTempo(intervalCounts, sampleRate, minBPM, maxBPM) {
    //console.log("Called groupNeighborsByTempo(intervalCounts, "+sampleRate+")");
    var tempoCounts = [];
    intervalCounts.forEach(function(intervalCount) {
        //Convert an interval to tempo
        var theoreticalTempo = 60.0 / (intervalCount.interval / sampleRate);

        theoreticalTempo = Math.round(theoreticalTempo);
        //console.log("theoreticalTempo, interval: " + theoreticalTempo + ", " + intervalCount.interval);

        if (theoreticalTempo === 0) {
            return;
        }
        // Adjust the tempo to fit within the min to max BPM range
        while (theoreticalTempo <= minBPM) theoreticalTempo *= 2;
        while (theoreticalTempo >= maxBPM) theoreticalTempo /= 2;

        //count the BPM found with tuple and return
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


function info(file, buffer){
    //info display of audio file
    console.log("name: " + file.name);
    console.log("length: " + buffer.length);
    console.log("duration: " + buffer.duration + "s");
    console.log("sampleRate: " + buffer.sampleRate);
}


function checkNumber(data){
    console.log("total tempoCounts = " + data.length);
    for (var i = 0; i < data.length; i++)
        if (data[i].count>1)
            console.log("here are " + data[i].count + " of " + data[i].tempo + " BPM");

}
