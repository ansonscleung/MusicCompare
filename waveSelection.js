var audioCtx = new(window.AudioContext || window.webkitAudioContext)();
var surferReady = false;
var blob = window.URL || window.webkitURL;
    if (!blob) {
        console.log('Your browser does not support Blob URLs :(');
    }
var startTime = null;
var EndTime = null;
var globalBuffer;
var selectedBuffer;


var wavesurfer = WaveSurfer.create({
    container: document.querySelector('#waveSelector'),
	normalize: true,
	progressColor: "#555",
	waveColor: "#555",
	cursorColor: "000",
    scrollParent: false
});
wavesurfer.on('ready', function () {
    surferReady = true;
	startTime = 0;
	EndTime = wavesurfer.getDuration();
});
/*
function start(){
	var file = audio_file.files[0],
	 fileURL = blob.createObjectURL(file);
	document.getElementById('audio_player').src = fileURL;
	wavesurfer.load(fileURL);

	var reader = new FileReader();

	reader.onload = function() {
		audioCtx.decodeAudioData(reader.result).then(function(buffer){
			globalBuffer = buffer;
			console.log("GlobalBuffer.length: "+ globalBuffer.length);
		});
	};
	reader.readAsArrayBuffer(file);
}*/

function surferPlay(){
	if (!surferReady){
		LogNotYetInitialize();
		return;
		}
	wavesurfer.playPause();

	if (wavesurfer.isPlaying())
		playsurfer.innerHTML = "Pause";
	else
		playsurfer.innerHTML = "Play";
}

function getStart(){
	if (surferReady){
		console.log("Start time: "+wavesurfer.getCurrentTime());
		startTime = Math.round(wavesurfer.getCurrentTime() * 100) / 100;
		var textSpan = document.getElementById("startText");
		if (textSpan)
			textSpan.textContent = startTime + " s";
	}else{
		LogNotYetInitialize();
	}
}

function getEnd(){
	if (surferReady){
		console.log("End time: "+wavesurfer.getCurrentTime());
		EndTime = Math.round(wavesurfer.getCurrentTime() * 100) / 100;
		var textSpan = document.getElementById("endText");
		if (textSpan)
			textSpan.textContent = EndTime + " s";
	}else
		LogNotYetInitialize();
}

function printLog(str){
	document.getElementById("output").textContent = document.getElementById("output").textContent + "\n" + str;
}

function LogNotYetInitialize(){
	printLog("The wave selector have not initialized yet.\n");
}

function testSelection(){
	if (!surferReady){
		LogNotYetInitialize();
		return;
	}
	if (startTime > EndTime){
		var t = startTime;
		startTime = EndTime;
		EndTime = t;
		printLog("The start time and end time is swapped.")
	}
	//console.log("Test selection start from "+startTime+"s to "+ EndTime+"s");
	selectedBuffer = getSelectionBuffer(globalBuffer, startTime, EndTime);
	//console.log("selectedBuffer.length: "+ selectedBuffer.length);
	testPlayAudioBuffer(selectedBuffer);

}

function getSelectionBuffer(buffer, start, end){
	var length = buffer.length;
	var sampleRate = buffer.sampleRate;
	var duration = end - start;
	duration = Math.round(duration * 100)/100;
	var myArrayBuffer = audioCtx.createBuffer(
		buffer.numberOfChannels, duration * sampleRate, sampleRate);

	console.log("duration, end, start = "+ duration +" "+ end +" "+start);
	for (var channel = 0; channel < buffer.numberOfChannels; channel++) {
		var Buffering = myArrayBuffer.getChannelData(channel);
		var sourceData = buffer.getChannelData(channel);
		for (var i = 0 ; i < duration * sampleRate ; i++) {
			Buffering[i] = sourceData[start * sampleRate + i];
		}
	}
	return myArrayBuffer;
}


function testPlayAudioBuffer(buffer){
	var playSource = audioCtx.createBufferSource();
	playSource.buffer = buffer;
	playSource.connect(audioCtx.destination);
	playSource.start();
	console.log("Start testPlayAudioBuffer()");
}



