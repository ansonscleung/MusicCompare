async function fingerprint(audio, low, high) {
    console.log("Called fingerprint.");
    var sRate = [audio[0].sampleRate, audio[1].sampleRate];
    if (audio[1].length > audio[0].length) {
        sRate[1] = audio[1].length*audio[1].sampleRate/audio[0].length;
    } else {
        sRate[0] = audio[0].length*audio[0].sampleRate/audio[1].length;
    }

    var ham_peaks = [];
    var lev_peaks = [];
    $.each(audio, function(index, buffer){
        var offlineContext = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
        var source = offlineContext.createBufferSource();
        source.buffer = buffer;
        var filter = offlineContext.createBiquadFilter();
        filter.type = "bandpass";
        // https://stackoverflow.com/questions/33540440/bandpass-filter-which-frequency-and-q-value-to-represent-frequency-range
        var geometricMean = Math.sqrt(high * low);
        filter.frequency.value = geometricMean;
        filter.Q.value = geometricMean / (high - low);
        source.connect(filter);
        filter.connect(offlineContext.destination);
        source.start(0);
        offlineContext.startRendering().then(function(filteredBuffer) {
            //If you want to analyze both channels, use the other channel later
            var data = filteredBuffer.getChannelData(0);
            var max = arrayMax(data);
            var min = arrayMin(data);

            var threshold = min + (max - min) * .6;
            //console.log("threshold = " + threshold);
            var ham_peak = getPeaksArrayAtThreshold(data, threshold, sRate[index], 100);
            var lev_peak = getPeaksArrayAtThreshold(data, threshold, buffer.sampleRate, 10);
            //console.log("peaks = " + lev_peak);

            ham_peaks.push(ham_peak);
            lev_peaks.push(lev_peak);
            if (ham_peaks.length == 2) {
                var ham = hammingDistance(ham_peaks[0], ham_peaks[1]);
                var score = (1 - ham/ham_peak.length);
                console.log(low+' to '+high+"Hz Hamming Distance: " + ham + "(" + score + ")");
                scoreTable.push(score);
                scoreCalc(scoreTable);
            }
            if (lev_peaks.length == 2) {
                var lev = levenshteinDistance(lev_peaks[0], lev_peaks[1]);
                var score = (1 - lev/Math.max(lev_peaks[0].length, lev_peaks[1].length));
                console.log(low+' to '+high+"Hz Levenshtein Distance: " + lev + "(" + score + ")");
                scoreTable.push(score);
                scoreCalc(scoreTable);
            }
        });
    });
}

async function fingerprintAll(audio) {
    console.log("Called fingerprintAll.");
    var sRate = [audio[0].sampleRate, audio[1].sampleRate];
    if (audio[1].length > audio[0].length) {
        sRate[1] = audio[1].length*audio[1].sampleRate/audio[0].length;
    } else {
        sRate[0] = audio[0].length*audio[0].sampleRate/audio[1].length;
    }

    var ham_peaks = [];
    var lev_peaks = [];
    $.each(audio, function(index, buffer){
        //If you want to analyze both channels, use the other channel later
        var data = buffer.getChannelData(0);
        var max = arrayMax(data);
        var min = arrayMin(data);

        var threshold = min + (max - min) * .6;
        //console.log("threshold = " + threshold);
        var ham_peak = getPeaksArrayAtThreshold(data, threshold, sRate[index], 100);
        var lev_peak = getPeaksArrayAtThreshold(data, threshold, buffer.sampleRate, 10);
        //console.log("peaks = " + lev_peak);

        ham_peaks.push(ham_peak);
        lev_peaks.push(lev_peak);
        if (ham_peaks.length == 2) {
            var ham = hammingDistance(ham_peaks[0], ham_peaks[1])
            console.log("Full Hamming Distance: " + ham + "(" + (1 - ham/ham_peak.length) + ")");
        }
        if (lev_peaks.length == 2) {
            var lev = levenshteinDistance(lev_peaks[0], lev_peaks[1])
            console.log("Full Levenshtein Distance: " + lev + "(" + (1 - lev/Math.max(lev_peaks[0].length, lev_peaks[1].length)) + ")");
        }
    });
}

async function fingerprintProcess(e, sampleRate) {
    console.log("Called fingerprintProcess");
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
}

function getPeaksArrayAtThreshold(data, threshold, sampleRate, skip) {
    console.log("Called getPeaksArrayAtThreshold with threshold " + threshold);
    var peaksArray = [];
    var length = data.length;
    for (var i = 0; i < length;) {
        //if (data[i] > threshold) {
        peaksArray.push(data[i] > threshold ? 1 : 0);
        // Skip forward ~ 1/4s to get past this peak.
        i += sampleRate/skip;
        //}
        //i++;
    }
    return peaksArray;
}
