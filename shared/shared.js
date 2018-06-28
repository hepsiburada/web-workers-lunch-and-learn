/**
 * @author Eray Arslan
 * @company Hepsiburada
 * @description https://slides.com/erayarslan/web-workers
 */
const ports = {};

onconnect = (e) => {
  const port = e.ports[0];

  port.onmessage = (e) => {
    ports[e.data] = port;
    port.postMessage('Hello ' + e.data);
  };
};

setTimeout(() => {
  ports['foo'].postMessage('After 3 sec Foo!');
}, 3000);

setTimeout(() => {
  ports['bar'].postMessage('After 5 sec Bar!');
}, 5000);


