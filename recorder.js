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
        $(list).find('tbody').append($('<tr>')
                                     .append($('<th>').text(rec['#record'].length).addClass("align-middle"))
                                     .append($('<td>').html(link).addClass("align-middle"))
                                     .append($('<td>').html(audio).addClass("align-middle"))
                                    );
    };

    // Select source and recording files
    $(document).on("click", "table tr", function(){
        $(this).addClass('table-active').siblings().removeClass('table-active');
        var value=$(this).find('td:first').find('a').attr('href');
    });

    // Compare button
    $(document).on("click", '#compare', async function(e){
        console.log("Source File: ", $("#sourceListNew tr.table-active th:first").text());
        console.log("Recording File: ", $("#recordingsListNew tr.table-active th:first").text());
        var file = {};
        file['Source'] = rec['#source'][parseInt($("#sourceListNew tr.table-active th:first").text(), 10)-1];
        file['Record'] = rec['#record'][parseInt($("#recordingsListNew tr.table-active th:first").text(), 10)-1];
        $.each(file, function(key, item){
            var reader = new FileReader();
            var context = new(window.AudioContext || window.webkitAudioContext)();
            reader.addEventListener("load", function() {
                context.decodeAudioData(reader.result).then(function(buffer){
                    info(item, buffer);
                    prepare(buffer, key);
                });
            });
            reader.readAsArrayBuffer(item);
        });
    });

    $(document).on("click", ".recorderAdd", function() {
        input = $(this).attr('data-target');
        if (!$(input)) {
            alert("Um, couldn't find the fileinput element.");
        }
        else if (!$(input).prop("files")) {
            alert("This browser doesn't seem to support the `files` property of file inputs.");
        }
        else if (!$(input).prop("files")[0]) {
            alert("Please select a file before clicking 'Load'");
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
                $(list).find('tbody').append($('<tr>')
                                             .append($('<th>').text(rec[input].length).addClass("align-middle"))
                                             .append($('<td>').html($(link).attr('data-blob', file)).addClass("align-middle"))
                                             .append($('<td>').html(audio).addClass("align-middle"))
                                            );
            }, false);
        }
    });
});

$(document).on("change", ".custom-file-input", function() {
    var fileName = $(this).val().split("\\").pop();
    $(this).siblings(".custom-file-label").addClass("selected").html(fileName);
});

