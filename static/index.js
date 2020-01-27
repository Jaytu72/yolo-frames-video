import yolo, { downloadModel } from './yolo.js';

const W = 416;
const H = 416;
const W_RATIO = 1;
const H_RATIO = 1;

const BOX_COLORS = ['red', 'blue', 'green', 'orange', 'purple'];

function startFrames() {
    if(yolo_frames.length == 0) {
        $('#play-button').prop('disabled',true);
        return false;
    }

    let canvas = document.getElementById('canvas');
    let context = canvas.getContext('2d');
    let img = new Image;
    img.src = yolo_frames.shift();
    img.onload = function() {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    setTimeout(function() {
        requestAnimationFrame(startFrames)
    }, 60);
}

async function predict(tensor, model, img, index) {
    let data = await yolo(tensor, model);
  
    let temp = document.createElement('canvas');
    let tc = temp.getContext('2d');
  
    temp.width= W;
    temp.height = H;
  
    tc.drawImage(img, 0, 0, W, H);

    // If predictions are returned, draw boxes on canvas.
    try {
      for (let i = 0; i < 3; i++) {
        let left = data[i].left;
        let right = data[i].right;
        let top = data[i].top;
        let bottom = data[i].bottom;

        // Draw boxes with predicted classes.
        tc.fillStyle = BOX_COLORS[i];
        tc.strokeStyle = BOX_COLORS[i];
        tc.lineWidth = 5;
        tc.strokeRect(left * W_RATIO, top * H_RATIO, (right - left) * W_RATIO, (bottom - top) * H_RATIO);
        tc.font = '15pt Courier New ';
        tc.fillRect(left * W_RATIO, top * H_RATIO, data[i].className.length * 15, 35);
        tc.fillStyle = 'black';
        tc.fillText(data[i].className, left * W_RATIO + 5, top * H_RATIO + 20);
      }
    }
    catch(e) {
      console.log('empty list');
    }
  
    let t_img = temp.toDataURL();
    yolo_frames.push(t_img);
  
    if(index == frames.length-1) {
        $('.progress-bar').prop('style','width:100%');
        $('#loading-span').text('Done');
        $('#play-button').click(startFrames);

        $('#prepare-button').prop('disabled',true);
        $('#play-button').prop('disabled',false);

        $('#prepare-bar').addClass('hide');
    }
}

function predictFrames() {
    for(let i = 0; i < frames.length; i++) {
        let img = new Image;
        img.src = frames[i];
        img.onload = function(){
            let tensor = tf.fromPixels(img)
            .resizeNearestNeighbor([416,416])
            .toFloat()
            .expandDims();
      
            predict(tensor, model, img, i);
        };
    }
}

function addFrames(v) {
    if(v.ended) {
        $('.progress-bar').prop('style','width:60%');
        $('#loading-span').text('Extracted video frames')
        predictFrames();
        return false;
    }
    if(v.paused) return false;

    let temp = document.createElement('canvas');
    let tc = temp.getContext('2d');

    temp.width = W;
    temp.height = H;

    tc.drawImage(v, 0, 0, temp.width, temp.height);
    let frame = temp.toDataURL();
    frames.push(frame);
    console.log('pushed')

    setTimeout(addFrames, 20, v);
}

function initVideo() {
    $('#prepare-button').prop('disabled',true);
    $('#prepare-bar').removeClass('hide');
    // Create video element to play in the background.
    let vid = document.createElement('video');
 
    // Set background video properties.
    vid.width = W;
    vid.height = H;
    vid.muted = true;
    vid.preload = true;
    vid.loop = false;
    vid.src = dataURL;

    // Add event listener to trigger addFrames function
    // when video begins playing.
    vid.addEventListener('play', function(){
        addFrames(this);
    }, false);

    $('.progress-bar').prop('style','width:50%');
    $('#loading-span').text('Ready video')
    vid.play();
};

var model;
var dataURL;
var frames = [];
var yolo_frames = [];

$("#video-selector").change(function () {
    let reader = new FileReader();
    reader.onload = function () {
        dataURL = reader.result;
    }

    let file = $("#video-selector").prop("files")[0];
    try {
        reader.readAsDataURL(file);
        $('#prepare-button').prop('disabled',false);
    }
    catch(e) {
        console.log('Bad input');
    }
}); 

(async function() {
    // Function imported from @MikeShi42 (https://github.com/ModelDepot/tfjs-yolo-tiny).
    model = await downloadModel();
  
    $('.spinner-border').hide();
    $('#prepare-button').click(initVideo);
})();