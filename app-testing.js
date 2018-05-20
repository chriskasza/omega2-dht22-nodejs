// var util = require('util');
// var spawn = require('child_process').spawn;
var execFile = require('child_process').execFile;
var request = require('request');
var fs = require('fs');

var lastPlottedTemp = 17;
var logfile = '/root/app.log'

// Twilio Credentials
// const accountSid = process.env.TWILIO_ACCT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// require the Twilio module and create a REST client
// const client = require('twilio')(accountSid, authToken);

// var mosqparam = [
//   '--cafile', '/root/VeriSign-Class3-Public-Primary-Certification-Authority-G5.pem',
//   '--cert', '/root/62d661a1c4-certificate.pem.crt',
//   '--key', '/root/62d661a1c4-private.pem.key',
//   '-h', 'a1mel9wxwu1j26.iot.us-east-2.amazonaws.com',
//   '-p', '8883'
// ];

// var checkTempThreshold = function(temp) {
//   if(temp < 12 || temp > 22) sendSms(temp);
// };

// send SMS alert with Twilio
// var sendSms = function(temp) {
//   client.messages
//     .create({
//       to: process.env.TWILIO_SMS_TO;
//       from: process.env.TWILIO_SMS_FROM;
//       body: 'TEMP ALERT: ' + temp + '°C'
//     })
//     // .then(message => console.log(message.sid));
// };


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

      // Check threshold and SMS if necessary
      // checkTempThreshold(parseFloat(dataArray[1]));

      // // publish to main AWS data queue (for DynamoDB)
      // execFile(
      //   'mosquitto_pub',
      //   mosqparam.concat(
      //     '-t', 'temp-humidity/Omega-1535',
      //     '-m', JSON.stringify(postData)
      //   ),
      //   function(error, stdout, stderr) { } // published
      // );
      //
      // // publish to AWS device shadow
      // var shadowPayload = {
      //   state: {
      //     desired: {
      //       datetime: logDate.toISOString(),
      //       humidity: parseFloat(dataArray[0]),
      //       temperature: parseFloat(dataArray[1])
      //     }
      //   }
      // };
      //
      // execFile(
      //   'mosquitto_pub',
      //   mosqparam.concat(
      //     '-t', '$aws/things/Omega-1535/shadow/update',
      //     '-m', JSON.stringify(shadowPayload)
      //   ),
      //   function(error, stdout, stderr) { } // shadow update done
      // );
    }
  );
}, 1000 * 15 );
