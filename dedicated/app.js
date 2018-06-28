/**
 * @author Eray Arslan
 * @company Hepsiburada
 * @description https://slides.com/erayarslan/web-workers
 */

const WorkerScripts = {};

WorkerScripts.pixel = `
const pixelChars = 'MNHQ$OC?7>!:-;. ';

const process = (data) => {
  const array = data.array;
  const stringArray = [];

  for (let i = 0; i < array.length; i += 4) {
    const color = {red: array[i], green: array[i + 1], blue: array[i + 2]};
    const average = (color.red + color.green + color.blue) / 3;
    const charIndex = Math.floor((average / 256) * 16);

    stringArray.push(pixelChars[charIndex]);
  }

  return stringArray;
};

onmessage = (e) => {
  postMessage(process(e.data))
};
`;

WorkerScripts.black = `
const process = (data) => {
  const array = data.array;

  for (let i = 0; i < array.length; i += 4) {
    const color = {red: array[i], green: array[i + 1], blue: array[i + 2]};
    const average = (color.red + color.green + color.blue) / 3;
    const decider = 255 / 5;
    const decided = average > decider ? 255 : 0;

    array[i] = decided;
    array[i + 1] = decided;
    array[i + 2] = decided;
  }

  return {area: data.area, array: array};
};

onmessage = (e) => {
  postMessage(process(e.data))
};
`;

WorkerScripts.grey = `
const process = (data) => {
  const array = data.array;

  for (let i = 0; i < array.length; i += 4) {
    const color = {red: array[i], green: array[i + 1], blue: array[i + 2]};
    const average = (color.red + color.green + color.blue) / 5;

    array[i] = average;
    array[i + 1] = average;
    array[i + 2] = average;
  }

  return {area: data.area, array: array};
};

onmessage = (e) => {
  postMessage(process(e.data))
};
`;

WorkerScripts.sepia = `
const process = (data) => {
  const array = data.array;

  for (let i = 0; i < array.length; i += 4) {
    const color = {red: array[i], green: array[i + 1], blue: array[i + 2]};

    let red = color.red;
    let green = color.green;
    let blue = color.blue;

    red = (red * 0.393) + (green * 0.769) + (blue * 0.189);
    green = (red * 0.349) + (green * 0.686) + (blue * 0.168);
    blue = (red * 0.272) + (green * 0.534) + (blue * 0.131);

    array[i] = (red < 255) ? red : 255;
    array[i + 1] = (green < 255) ? green : 255;
    array[i + 2] = (blue < 255) ? blue : 255;
  }

  return {area: data.area, array: array};
};

onmessage = (e) => {
  postMessage(process(e.data))
};
`;

const Example = {
  videoEl: document.getElementById('video'),
  canvasEl: document.getElementById('canvas'),
  canvasPureEl: document.getElementById('canvas-pure'),
  pixelEl: document.getElementById('pixel'),
  sourcesEl: document.getElementById('sources'),
  workers: {},
  filters: ['black', 'grey', 'sepia'],
  createWorker: function (name) {
    const blobObj = new Blob([WorkerScripts[name]], {type: 'text/javascript'});
    const blobUrl = URL.createObjectURL(blobObj);

    Example.workers[name] = new Worker(blobUrl);
    Example.workers[name].onmessage = function (e) {
      const array = e.data.array;
      const area = e.data.area;

      for (let i = 0; i < array.length; i++) {
        Example.currentFrame.data[(area * array.length) + i] = array[i];
      }

      Example.setFrame(Example.context, Example.currentFrame);
    };
  },
  initFilterWorkers: function () {
    Example.filters.forEach(Example.createWorker);
  },
  chunkify: function (a, n, balanced) {
    if (n < 2) {
      return [a];
    }

    let len = a.length, out = [], i = 0, size;

    if (len % n === 0) {
      size = Math.floor(len / n);
      while (i < len) {
        out.push(a.slice(i, i += size));
      }
    }

    else if (balanced) {
      while (i < len) {
        size = Math.ceil((len - i) / n--);
        out.push(a.slice(i, i += size));
      }
    }

    else {
      n--;
      size = Math.floor(len / n);

      if (len % size === 0) {
        size--;
      }

      while (i < size * n) {
        out.push(a.slice(i, i += size));
      }

      out.push(a.slice(size * n));
    }

    return out;
  },
  getCurrentFrameUrl: function (canvasEl) {
    return canvasEl.toDataURL("image/png");
  },
  fetchDevices: function (callback) {
    navigator.mediaDevices.enumerateDevices()
      .then(function (devices) {
        devices.forEach(function (device, index) {
          if (device.kind === 'videoinput') {
            callback(device, index);
          }
        });
      });
  },
  currentFrame: null,
  init: function () {
    Example.initFilterWorkers();

    Example.fetchDevices(function (device, index) {
      const li = document.createElement('li');
      const button = document.createElement('button');

      button.id = device.deviceId;
      button.innerText = 'Start with ' + device.kind + ' ' + index;
      button.title = device.label;
      button.onclick = function () {
        Example.live(device.deviceId);
      };

      li.appendChild(button);
      Example.sourcesEl.appendChild(li);
    });

    Example.context = Example.canvasEl.getContext('2d');
    Example.contextPure = Example.canvasPureEl.getContext('2d');

    Example.registerEvents();
  },
  live: function (deviceId) {
    if (!!Example.stream) {
      Example.videoEl.src = null;
      Example.stream.getTracks().forEach(function (track) {
        track.stop();
      });
    }

    navigator.mediaDevices.getUserMedia({
      deviceId: deviceId,
      video: {width: 256, height: 256, frameRate: 60},
    }).then(function (stream) {
      Example.stream = stream;
      Example.videoEl.src = window.URL.createObjectURL(stream);
    });
  },
  loop: function () {
    requestAnimationFrame(Example.loop);
    Example.draw();
  },
  setFrame: function (context, frame) {
    context.putImageData(frame, 0, 0);
  },
  getFrame: function (context, canvasEl) {
    return context.getImageData(0, 0, canvasEl.width, canvasEl.height);
  },
  drawCamera: function (context) {
    context.drawImage(Example.videoEl, 0, 0);
  },
  draw: function () {
    Example.drawCamera(Example.contextPure);

    const frame = Example.getFrame(Example.contextPure, Example.canvasPureEl);

    Example.currentFrame = frame;

    const arrays = Example.chunkify(frame.data, 4, true);

    Example.filters.forEach(function (filter, index) {
      Example.workers[filter].postMessage({area: index, array: arrays[index]});
    });
  },
  events: {
    videoLoadedMetaData: function () {
      const width = Example.videoEl.videoWidth;
      const height = Example.videoEl.videoHeight;

      Example.canvasEl.width = width;
      Example.canvasEl.height = height;

      Example.canvasPureEl.width = width;
      Example.canvasPureEl.height = height;

      Example.loop();
    }
  },
  registerEvents: function () {
    Example.videoEl.addEventListener('loadedmetadata', Example.events.videoLoadedMetaData, false);
  },
  unregisterEvents: function () {
    Example.videoEl.removeEventListener('loadedmetadata', Example.events.videoLoadedMetaData, false);
  }
};

Example.init();