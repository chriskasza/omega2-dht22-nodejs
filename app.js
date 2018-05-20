var execFile = require('child_process').execFile;
var request = require('request');
var fs = require('fs');

var lastPlottedTemp = 17;
var logfile = '/root/app.log'

var logger = function (line, file) {
  fs.appendFile(file, line + "\n", function(err) {
    if(err) {
      return console.log(err);
    }

    console.log("Logged: \"" + line + "\"");
  });
}

logger(Date().toString() + " - start interval", logfile);
setInterval(function() {
  execFile(
    '/root/checkHumidity',
    ['3', 'DHT22'],
    function(error, stdout, stderr) {
      var dataArray = stdout.split("\n");
      var logDate = new Date();
      var postData = {
        datetime: logDate.toISOString(),
        humidity: parseFloat(dataArray[0]),
        temperature: parseFloat(dataArray[1])
      };
      var params = {
        'field1': parseFloat(dataArray[0]),
        'field2': parseFloat(dataArray[1]),
        'key': process.env.THINGSPEAK_KEY
      };

      if (error === null) {
        logger(Date().toString() + " - humidity: " + parseFloat(dataArray[0]), logfile);
        logger(Date().toString() + " - temperature: " + parseFloat(dataArray[1]), logfile);
        logger(Date().toString() + " - params: " + JSON.stringify(params), logfile);
      } else {
        logger(Date().toString() + " - error: " + error, logfile);
      }

      if(parseFloat(dataArray[0]) == -255) return;

      // publish to ThingSpeak if delta is at least 1
      if(Math.abs(parseInt(dataArray[1]) - lastPlottedTemp)) {
        request.post('https://api.thingspeak.com/update', {form: params},
          function(err,httpResponse,body) {
            if (err) {
              logger(Date().toString() + ' - upload failed: ' + err, logfile);
            }
            logger(Date().toString() + ' - Upload successful!  Server responded with: ' + body, logfile);
          }
        );

        lastPlottedTemp = parseInt(dataArray[1]);
      }
    }
  );
}, 1000 * 60 * 5 );
