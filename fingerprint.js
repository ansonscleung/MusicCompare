async function fingerprint(audio) {
    console.log("Called prepare.");
    console.log(audio);
    var sRate = [audio[0].sampleRate, audio[1].sampleRate];
    if (audio[1].length > audio[0].length) {
        sRate[1] = audio[1].length*audio[1].sampleRate/audio[0].length;
    } else {
        sRate[0] = audio[0].length*audio[0].sampleRate/audio[1].length;
    }
    var peaks = [];
    $.each(audio, function(index, buffer){
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
            fingerprintProcess(e, sRate[index]).then(function(peak){
                peaks.push(peak);
                console.log(peaks.length);
                if (peaks.length == 2)
                    console.log("Hamming Distance: " + hammingDistance(peaks[0], peaks[1]));
                    console.log("Levenshtein Distance: " + levenshteinDistance(peaks[0], peaks[1]));
            });
        };
    });
}

async function fingerprintProcess(e, sampleRate) {
    console.log("Called process");
    var filteredBuffer = e.renderedBuffer;
    //If you want to analyze both channels, use the other channel later
    var data = filteredBuffer.getChannelData(0);
    var max = arrayMax(data);
    var min = arrayMin(data);
    //console.log("max,min  = " + max + " " + min);

    var threshold = min + (max - min) * .6;
    //console.log("threshold = " + threshold);
    var peaks = getPeaksArrayAtThreshold(data, threshold, sampleRate);
    console.log("peaks = " + peaks);
    return peaks;

    /*var intervalCounts = countIntervalsBetweenNearbyPeaks(peaks);
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
    } else return 0;*/
}

function getPeaksArrayAtThreshold(data, threshold, sampleRate) {
    console.log("Called getPeaksAtThreshold with threshold " + threshold);
    var peaksArray = [];
    var length = data.length;
    for (var i = 0; i < length;) {
        //if (data[i] > threshold) {
        peaksArray.push(data[i] > threshold ? 1 : 0);
        // Skip forward ~ 1/4s to get past this peak.
        i += sampleRate/100;
        //}
        //i++;
    }
    return peaksArray;
}
