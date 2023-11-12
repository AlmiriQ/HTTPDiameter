'use strict';

var diameter = require('diameter');
var diameter_dict = require('diameter-dictionary');
var diameter_avp = require('diameter-avp-object');
const http = require("http");

var HOST = '198.19.0.254';
var PORT = 3868;

var options = {
    beforeAnyMessage: () => {},
    afterAnyMessage: () => {},
    port: PORT,
    host: HOST
};

// function removeNestedArrays(arr) {
//     if (arr.length == 1) return arr[0];
//     let result = [];
//     arr.forEach((x) => {
//         if (Array.isArray(x)) result.push(removeNestedArrays(x));
//         else result.push(x);
//     })
//     return result
// }

const requestListener = function (req, res) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        let raw_data = JSON.parse(body);
        try {
            raw_data.serviceInformation.psInformation["3gppChargingId"] = Buffer.from(raw_data.serviceInformation.psInformation["3gppChargingId"], 'utf-8');
        } catch {}
        let forward_data = diameter_avp.fromObject(raw_data);
        console.log("%", forward_data);
        var socket = diameter.createConnection(options, function() {
            var connection = socket.diameterConnection;
            var request = connection.createRequest('Diameter Common Messages', 'Capabilities-Exchange', diameter_avp.toObject(forward_data).sessionId);
            request.body = request.body.concat(forward_data);
            request.body = request.body.concat([
                [ 'Origin-Host', 'pgw1.hackaton.uisi.ru' ],
                [ 'Origin-Realm', 'hackaton.uisi.ru' ],
                [ 'Vendor-Id', 10415 ],
                // [ 'Origin-State-Id', 219081 ],
                [ 'Supported-Vendor-Id', 10415 ],
                [ 'Auth-Application-Id', 'Diameter Credit Control Application' ]
            ]);
            let shit = diameter_avp.toObject(request.body);
            console.log("!", shit)
            // Handling server initiated messages:
            try {
                connection.sendRequest(request).then(function(response) {
                    // handle response
                    console.log("$", JSON.stringify(diameter_avp.toObject(response.body)))
                    res.statusCode = 200;
                    res.writeHead(200);
                    res.end(JSON.stringify(diameter_avp.toObject(response.body)));
                }, function(error) {
                    console.log('#Error sending request: ' + error);
                });
            } catch (e) {
                console.error(e);
                res.statusCode = 500;
                res.writeHead(500);
                shit["error"] = e.toString();
                res.end(JSON.stringify(shit));
                console.error("SEND SHIT");
            }
        });
        // socket.on('diameterMessage', function(event) {
        //     console.log('Received server initiated message');
        //     if (event.message.command === 'Capabilities-Exchange') {
        //         event.response.body = event.response.body.concat([
        //             ['Result-Code', 'DIAMETER_SUCCESS'],
        //             ['Origin-Host', 'gx.pcrf.example.com'],
        //             ['Origin-Realm', 'pcrf.example.com'],
        //             ['Host-IP-Address', '2001:db8:3312::1'],
        //             ['Host-IP-Address', '1.2.3.4'],
        //             ['Vendor-Id', 123],
        //             ['Product-Name', 'node-diameter']
        //         ]);
        //         event.callback(event.response);
        //         // socket.diameterConnection.end();
        //     }
        // });
        socket.on('error', function(err) {
            console.log(err);
        });
    });
};

const server = http.createServer(requestListener);
server.listen(8000, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:8000`);
});

console.log("This is v1.4");