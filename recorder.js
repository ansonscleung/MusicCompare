$(document).ready(function () {
    var recorder = new Recorder({
        /*monitorGain: parseInt(monitorGain.value, 10),
        recordingGain: parseInt(recordingGain.value, 10),
        numberOfChannels: parseInt(numberOfChannels.value, 10),
        wavBitDepth: parseInt(bitDepth.value,10),*/
        encoderPath: "opus-recorder/dist/waveWorker.min.js"
    });

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
    $("#stopButton").on( "click", function(){ recorder.stop();
                                             Clock.reset();});
    $("#recordButton").on( "click", function(){ 
        recorder.start().catch(function(e){
            console.log('Error encountered:', e.message );
        });
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
        $('#recordingsList').append(li);
    };

});

$(document).on("change", ".custom-file-input", function() {
    var fileName = $(this).val().split("\\").pop();
    $(this).siblings(".custom-file-label").addClass("selected").html(fileName);
});

$(document).on("click", "#recorderAdd", function() {
    input = $("#recorder");
    if (!input) {
        alert("Um, couldn't find the fileinput element.");
    }
    else if (!input.prop("files")) {
        alert("This browser doesn't seem to support the `files` property of file inputs.");
    }
    else if (!input.prop("files")[0]) {
        alert("Please select a file before clicking 'Load'");               
    }
    else {
        file = input.prop("files")[0];
        fr = new FileReader();
        fr.readAsDataURL(file);
        fr.addEventListener("load", function () {
            var fileName = $("#recorder").val().split("\\").pop();
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
            //$('#sourceList').append(li);
            var tbody = $("#sourceListNew").find('tbody');
            tbody.append($('<tr>')
                         .append($('<th>').text(parseInt(tbody.find('th').last().text(), 10) + 1))
                         .append($('<td>').html(link))
                         .append($('<td>').html(audio))
                        );
        }, false);
    }
});