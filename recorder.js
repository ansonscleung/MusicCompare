var scoreTable = [];
var bpmTable = [];
var bar;


$(document).ready(function () {
    // Initialise recorder
    var recorder = new Recorder({
        /*monitorGain: parseInt(monitorGain.value, 10),
        recordingGain: parseInt(recordingGain.value, 10),
        numberOfChannels: parseInt(numberOfChannels.value, 10),
        wavBitDepth: parseInt(bitDepth.value,10),*/
        encoderPath: "opus-recorder/dist/waveWorker.min.js"
    });
    var rec = {'#source': [], '#record': []};

    // Initialise clock
    // https://jsfiddle.net/wizajay/rro5pna3/
    var Clock = {
        totalSeconds: 0,

        start: function () {
            var self = this;
            function pad(val) { return val > 9 ? val : "0" + val; }
            this.interval = setInterval(function () {
                self.totalSeconds += 1;

                $("#min").text(pad(Math.floor(self.totalSeconds / 60 % 60)));
                $("#sec").text(pad(parseInt(self.totalSeconds % 60)));
            }, 1000);
        },

        reset: function () {
            Clock.totalSeconds = null; 
            clearInterval(this.interval);
            $("#min").text("00");
            $("#sec").text("00");
        },

        pause: function () {
            clearInterval(this.interval);
            delete this.interval;
        },

        resume: function () {
            if (!this.interval) this.start();
        },

        restart: function () {
            this.reset();
            Clock.start();
        }
    };

    // Initialise opus-recorder
    // https://github.com/chris-rudmin/opus-recorder/blob/master/example/waveRecorder.html
    $("#pauseButton").on( "click", function(){ 
        if ($(this).val() == "pause"){
            //pause
            recorder.pause();
            Clock.pause();
            $(this).val("resume");
            $(this).html("<i class=\"fas fa-eject fa-rotate-90\"></i> Resume");
        }else{
            //resume
            recorder.resume();
            Clock.resume();
            $(this).val("pause");
            $(this).html("<i class=\"fas fa-pause\"></i> Pause");
        } });
    $("#resumeButton").on( "click", function(){ recorder.resume(); });
    $("#stopButton").on( "click", function(){
        recorder.stop();
        $("#recordTime").collapse('hide');
        Clock.reset();
    });
    $("#recordButton").on( "click", function(){ 
        recorder.start().catch(function(e){
            console.log('Error encountered:', e.message );
        });
        $("#recordTime").collapse('show');
        Clock.start();
    });
    recorder.onstart = function(){
        console.log('Recorder is started');
        $("#recordButton").prop("disabled", true);
        $("#resumeButton").prop("disabled", true);
        $("#pauseButton").prop("disabled", false);
        $("#stopButton").prop("disabled", false);
    };
    recorder.onstop = function(){
        console.log('Recorder is stopped');
        $(this).val("pause");
        $(this).html("<i class=\"fas fa-pause\"></i> Pause");
        $("#recordButton").prop("disabled", false);
        $("#pauseButton").prop("disabled", true);
        $("#resumeButton").prop("disabled", true);
        $("#stopButton").prop("disabled", true);
    };
    recorder.onpause = function(){
        console.log('Recorder is paused');
        //$("#pauseButton").prop("disabled", true);
        $("#recordButton").prop("disabled", true);
        $("#resumeButton").prop("disabled", false);
        $("#stopButton").prop("disabled", false);
    };
    recorder.onresume = function(){
        console.log('Recorder is resuming');
        $("#recordButton").prop("disabled", true);
        $("#resumeButton").prop("disabled", true);
        $("#pauseButton").prop("disabled", false);
        $("#stopButton").prop("disabled", false);
    };
    recorder.onstreamerror = function(e){
        console.log('Error encountered: ' + e.message );
    };
    recorder.ondataavailable = function( typedArray ){
        var dataBlob = new Blob( [typedArray], { type: 'audio/wav' } );
        rec['#record'].push(dataBlob);
        var fileName = new Date().toISOString() + ".wav";
        var url = URL.createObjectURL( dataBlob );
        var audio = document.createElement('audio');
        audio.controls = true;
        audio.src = url;
        var link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.innerHTML = link.download;
        var li = document.createElement('li');
        li.appendChild(link);
        li.appendChild(document.createElement('br'));
        li.appendChild(audio);
        //$('#recordingsList').append(li);
        var list = $('#recordingsListNew');
        $(list).removeClass('d-none');
        $(list).find('tbody').append($('<tr>')
                                     .append($('<th>').text(rec['#record'].length).addClass("align-middle"))
                                     .append($('<td>').html(link).addClass("align-middle"))
                                     .append($('<td>').html(audio).addClass("align-middle"))
                                    );
    };

    // Select source and recording files
    $(document).on("click", "#recordingsListNew tbody tr", function(){
        $(this).addClass('table-active').siblings().removeClass('table-active');
        var value=$(this).find('td:first').find('a').attr('href');
    });
    $(document).on("click", "#sourceListNew tbody tr", function(){
        $(this).addClass('table-active').siblings().removeClass('table-active');
        var value=$(this).find('td:first').find('a').attr('href');
        $("#startText").text("");
        $("#endText").text("");
        console.log(value);
		//document.getElementById('audio_player').src = value;
		wavesurfer.load(value);
    });

    // Compare button
    $(document).on("click", '#compare', async function(e){
        var src_file = $("#sourceListNew tr.table-active th:first").text();
        var rec_file = $("#recordingsListNew tr.table-active th:first").text();
        if (!src_file || !rec_file) {
            alert("Please select file before clicking 'Compare'");
            return;
        }
        console.log("Source File: ", src_file);
        console.log("Recording File: ", rec_file);
        var file = {};
        file['#src_bpm'] = rec['#source'][parseInt(src_file, 10)-1];
        file['#rec_bpm'] = rec['#record'][parseInt(rec_file, 10)-1];

        scoreTable = []
        bpmTable = []
        $('#src_bpm').text("");
        $('#src_bpm').parent().addClass("d-none");
        $('#rec_bpm').text("");
        $('#rec_bpm').parent().addClass("d-none");
        var audio = [];
        $.each(file, function(key, item){
            var reader = new FileReader();
            var context = new(window.AudioContext || window.webkitAudioContext)();

            reader.addEventListener("load", function() {
                context.decodeAudioData(reader.result).then(function(buffer){
                    info(item, buffer);
					var selectedBPM = $("#sampleBPMSelection").val() ? $("#sampleBPMSelection").val() : 120;

					/************************************
					Added this
					************************************/
                    if (key == '#src_bpm') buffer = getSelectionBuffer(buffer, startTime, EndTime);
					console.log("Buffer length: "+buffer.length);

                    prepare(buffer, key, selectedBPM, 25, 0.75, 150).then(function(bpm){console.log("Prepare then");});
                    audio.push(buffer);
                    console.log(audio.length);
                    if (audio.length == 2) {
                        fingerprint(audio, 20, 400);
                        fingerprint(audio, 400, 4000);
                        fingerprint(audio, 4000, 20000);
                        fingerprintAll(audio);
                    }
                    var offlineContext = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
                    var source = offlineContext.createBufferSource();
                    source.buffer = buffer;
                    var analyser = offlineContext.createAnalyser();
                    analyser.fftSize = 256;
                    var bufferLength = analyser.frequencyBinCount;
                    console.log(bufferLength);
                    source.connect(analyser);
                    analyser.connect(offlineContext.destination);
                    source.start(0);
                    var dataArray = new Uint8Array(bufferLength);
                    offlineContext.startRendering().then(function(filteredBuffer) {
                        analyser.getByteFrequencyData(dataArray);
                        //console.log(dataArray);
                    });
                });
            });
            reader.readAsArrayBuffer(item);
        });
        $("#result").removeClass("d-none").addClass("d-flex flex-column");
        $('html, body').animate({
            scrollTop: $("#result").offset().top
        }, 1000)
        $("#score").html("");
        bar = new ProgressBar.Circle('#score', {
            color: '#aaa',
            // This has to be the same size as the maximum width to
            // prevent clipping
            strokeWidth: 4,
            trailWidth: 1,
            easing: 'easeInOut',
            duration: 1000,/*
            text: {
                autoStyleContainer: false
            },*/
            from: { color: '#f00', width: 1 },
            to: { color: '#0d4', width: 4 },
            // Set default step function for all animate calls
            step: function(state, circle) {
                circle.path.setAttribute('stroke', state.color);
                circle.path.setAttribute('stroke-width', state.width);

                var value = Math.round(circle.value() * 100);
                if (value === 0) {
                    circle.setText('');
                } else {
                    circle.setText(value);
                }

            }
        });
        //bar.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
        bar.text.style.fontSize = '2rem';
        bar.text.style.fontWeight = 'regular';
        bar.text.style.color = '#212529';
        bar.setText("Processing");
    });

    $(document).on("click", ".recorderAdd", function() {
        input = $(this).attr('data-target');
        if (!$(input)) {
            alert("Um, couldn't find the fileinput element.");
            return;
        }
        else if (!$(input).prop("files")) {
            alert("This browser doesn't seem to support the `files` property of file inputs.");
            return;
        }
        else if (!$(input).prop("files")[0]) {
            alert("Please select a file before clicking 'Load'");
            return;
        }
        else {
            file = $(input).prop("files")[0];
            rec[input].push(file);
            fr = new FileReader();
            fr.readAsDataURL(file);
            fr.addEventListener("load", function () {
                var fileName = $(input).val().split("\\").pop();
                var url = fr.result;
                var audio = document.createElement('audio');
                audio.controls = true;
                audio.src = url;
                var link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                link.innerHTML = link.download;
                var li = document.createElement('li');
                li.appendChild(link);
                li.appendChild(document.createElement('br'));
                li.appendChild(audio);
                var list = $($(input).attr('data-target'));
                $(list).removeClass('d-none');
                $(list).find('tbody').append($('<tr>')
                                             .append($('<th>').text(rec[input].length).addClass("align-middle"))
                                             .append($('<td>').html($(link).attr('data-blob', file)).addClass("align-middle"))
                                             .append($('<td>').html(audio).addClass("align-middle"))
                                            );
            }, false);
        }
    });



	/************************************
					Added this
	************************************/
	$(document).on("click", '#startSelection', async function(e){
        getStart();
    });
	/************************************
					Added this
	************************************/
	$(document).on("click", '#endSelection', async function(e){
        getEnd();
    });
});

$(document).on("click", "#startBtn", function() {
    $('html, body').animate({
        scrollTop: $("#musicCompare").offset().top
    }, 1000)
})

$(document).on("change", ".custom-file-input", function() {
    var fileName = $(this).val().split("\\").pop();
    $(this).siblings(".custom-file-label").addClass("selected").html(fileName);

});

$(document).on("change", '#src_bpm', function() {
    if ($('#rec_bpm').text() != "") {
        scoreCalc(1 - Math.abs(parseInt($('#src_bpm').text(), 10)-parseInt($('#rec_bpm').text(), 10))/parseInt($('#src_bpm').text(), 10));
    }
});
$(document).on("change", '#rec_bpm', function() {
    if ($('#src_bpm').text() != "") {
        scoreCalc(1 - Math.abs(parseInt($('#src_bpm').text(), 10)-parseInt($('#rec_bpm').text(), 10))/parseInt($('#src_bpm').text(), 10));
    }
});





function scoreCalc(table) {
    var len = table.reduce((a,b)=>a+b.base, 0);//table.length;
    var score = table.reduce((a,b)=>a+b.score*b.base, 0)/len;
    //console.log(table);
    //console.log(score);
    bar.animate(score);
    bar.text.style.fontWeight = 'bold';
    bar.text.style.fontSize = '5rem';
    $("#subScore").html("");
    $.each(table.sort(function(a, b) {
        var x = a.name; var y = b.name;
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    }), function(key, item) {
        var newBar = $("<div>").prop('id', "score_"+key).addClass('my-2');
        $("#subScore").append(newBar).append($('<p>').addClass('card-title').text(item.type+": "+(item.score * 100).toFixed(2) + ' %'));
        var bar = new ProgressBar.Line("#score_"+key, {
            color: '#aaa',
            strokeWidth: 4,
            easing: 'easeInOut',
            duration: 1400,
            trailColor: '#eee',
            trailWidth: 1,
            svgStyle: {width: '100%', height: '100%'},
            from: { color: '#f00', width: 1 },
            to: { color: '#0d4', width: 4 },
            step: (state, bar) => {
                bar.path.setAttribute('stroke', state.color);
            }
        });
        bar.animate(item.score);
    });
}

function bpmCalc(table) {
    var len = table.length;
    if (table.length == 2) {
        var bpmScore = [];
        bpmScore.push(1-Math.abs(table[0][0] - table[1][0])/table[0][0]);
        bpmScore.push(1-Math.abs((table[0][0] + table[0][1]) - (table[1][0] + table[1][1]))/(table[0][0] + table[0][1]));
        bpmScore.push(1-Math.abs((table[0][0] - table[0][1]) - (table[1][0] - table[1][1]))/(table[0][0] - table[0][1]));
        var score = bpmScore.reduce((a,b)=>a+b)/bpmScore.length;
        //console.log("BPM Score: " + score);
        scoreTable.push({type: "bpm", name: "Beats per minute (BPM)",score: score, base:2});
        scoreCalc(scoreTable);
    }
}


