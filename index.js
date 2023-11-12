'use strict';

const diameter = require('diameter');
const diameter_dict = require('diameter-dictionary');
const diameter_avp = require('diameter-avp-object');
const http = require("http");

const options = {
    beforeAnyMessage: () => {},
    afterAnyMessage: () => {},
    port: 3868,
    host: '198.19.0.254'
};

const SERVER_HOST = '198.19.0.200';
const SERVER_PORT = 3868;

var d_socket;
var d_connection;
var d_server;

// function removeNestedArrays(arr) {
//     if (arr.length == 1) return arr[0];
//     let result = [];
//     arr.forEach((x) => {
//         if (Array.isArray(x)) result.push(removeNestedArrays(x));
//         else result.push(x);
//     })
//     return result
// }

async function sendAVPData(data) {
    //Capabilities-Exchange
    //Credit-Control
    let request = d_connection.createRequest('Diameter Credit Control Application', 'Credit-Control', diameter_avp.toObject(data).sessionId);
    // request.body = request.body.concat(data);
    request.body = request.body.concat([
        [ 'Origin-Host', 'pgw1.hackaton.uisi.ru' ],
        [ 'Origin-Realm', 'hackaton.uisi.ru' ],
        [ 'Vendor-Id', 10415 ],
        [ 'Service-Context-Id', '8.32251@3gpp.org' ],
        [ 'Supported-Vendor-Id', 10415 ],
        [ 'Auth-Application-Id', 'Diameter Credit Control Application' ]
    ]);
    request.body = request.body.concat(data);
    let shit = diameter_avp.toObject(request.body);
    try {
        // handle response
        let response = await d_connection.sendRequest(request);
        console.log("$", JSON.stringify(diameter_avp.toObject(response.body)));
        return [200, JSON.stringify(diameter_avp.toObject(response.body))];
    } catch (e) {
        console.error(e);
        shit["error"] = e.toString();
        console.error("SEND SHIT");
        return [500, JSON.stringify(shit)];
    }
}

function requestListener(req, res) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        let raw_data = JSON.parse(body);
        {
            let must_be_buffer = [
                "3gppChargingId", "3gppMsTimezone",
                "3gppUserLocationInfo", "3gppRatType"
            ];
            must_be_buffer.forEach((mbb) => {
                try {
                    raw_data.serviceInformation.psInformation[mbb] = Buffer.from(raw_data.serviceInformation.psInformation[mbb], 'utf-8');
                } catch {}
            })
        }
        {
            let must_be_buffer = [
                "userEquipmentInfoValue"
            ];
            must_be_buffer.forEach((mbb) => {
                try {
                    raw_data.userEquipmentInfo[mbb] = Buffer.from(raw_data.userEquipmentInfo[mbb], 'utf-8');
                } catch {}
            })
            console.log(raw_data.userEquipmentInfo);
        }
        let forward_data = diameter_avp.fromObject(raw_data);
        console.log("%", forward_data);
        sendAVPData(forward_data).then((result) => {
            let status = result[0]
            let data = result[1];
            console.log(status, data)
            res.statusCode = status;
            res.writeHead(status);
            res.end(data);
        })
    });
};

d_server = diameter.createServer({beforeAnyMessage:()=>{},afterAnyMessage:()=>{}}, function(socket) {
    socket.on('diameterMessage', function(event) {
        console.log("$", event.message);
        if (event.message.command === 'Capabilities-Exchange') {
            event.response.body = event.response.body.concat([
                [ 'Origin-Host', 'pgw1.hackaton.uisi.ru' ],
                [ 'Origin-Realm', 'hackaton.uisi.ru' ],
                [ 'Result-Code', 'DIAMETER_SUCCESS' ],
                [ 'Supported-Vendor-Id', 10415 ]
            ]);
            event.callback(event.response);
        }
    });
    socket.on('end', function() {
        console.log('Client disconnected.');
    });
    socket.on('error', function(err) {
        console.log("/", err);
    });
    // Example server initiated message
    setTimeout(function() {
        console.log('Sending server initiated message');
        let connection = socket.diameterConnection;
        let request = connection.createRequest('Diameter Common Messages', 'Capabilities-Exchange');
        request.body = request.body.concat([
            [ 'Origin-Host', 'pgw1.hackaton.uisi.ru' ],
            [ 'Origin-Realm', 'hackaton.uisi.ru' ],
            [ 'Result-Code', 'DIAMETER_SUCCESS' ],
            [ 'Supported-Vendor-Id', 10415 ],
            [ 'Supported-Vendor-Id', 0 ],
            [ 'Host-IP-Address', '198.19.0.200' ],
            [ 'Vendor-Id', 10415 ],
            [ 'Product-Name', 'mock OCS' ],
            [ 'Acct-Application-Id', 'Diameter Credit Control Application' ],
            [ 'Auth-Application-Id', 'Diameter Credit Control Application' ],
            [ 'Vendor-Specific-Application-Id', [
                [ 'Vendor-Id', 10415 ],
                [ 'Acct-Application-Id', 'Diameter Credit Control Application' ]
            ] ],
            [ 'Vendor-Specific-Application-Id', [
                [ 'Vendor-Id', 10415 ],
                [ 'Auth-Application-Id', 'Diameter Credit Control Application' ]
            ] ],
        ]);
        connection.sendRequest(request).then(function(response) {
            console.log('Got response for server initiated message');
        }, function(error) {
            console.log('Error sending request: ' + error);
        });
    }, 2000);
});

d_server.listen(SERVER_PORT, SERVER_HOST);

console.log('Started DIAMETER server on ' + SERVER_HOST + ':' + SERVER_PORT);

d_socket = diameter.createConnection(options, function() {
    d_connection = d_socket.diameterConnection;
    const server = http.createServer(requestListener);
    server.listen(8000, '0.0.0.0', () => {
        console.log(`Server is running on http://0.0.0.0:8000`);
    });
    console.log("Node JSON<>AVP Server v1.6");

    let request = d_connection.createRequest('Diameter Credit Control Application', 'Capabilities-Exchange');
    request.body = request.body.concat([
        [ 'Origin-Host', 'pgw1.hackaton.uisi.ru' ],
        [ 'Origin-Realm', 'hackaton.uisi.ru' ],
        [ 'Result-Code', 'DIAMETER_SUCCESS' ],
        [ 'Supported-Vendor-Id', 10415 ],
        [ 'Supported-Vendor-Id', 0 ],
        [ 'Host-IP-Address', '198.19.0.200' ],
        [ 'Vendor-Id', 10415 ],
        [ 'Product-Name', 'mock OCS' ],
        [ 'Acct-Application-Id', 'Diameter Credit Control Application' ],
        [ 'Auth-Application-Id', 'Diameter Credit Control Application' ],
        [ 'Vendor-Specific-Application-Id', [
            [ 'Vendor-Id', 10415 ],
            [ 'Acct-Application-Id', 'Diameter Credit Control Application' ]
        ] ],
        [ 'Vendor-Specific-Application-Id', [
            [ 'Vendor-Id', 10415 ],
            [ 'Auth-Application-Id', 'Diameter Credit Control Application' ]
        ] ],
    ]);
    d_connection.sendRequest(request).then(function(response) {
        console.log(":", response);
    }, function(error) {
        console.log('Error sending request: ' + error);
    });
})

d_socket.on('diameterMessage', function(event) {
    console.log('Received server initiated message');
    if (event.message.command === 'Capabilities-Exchange') {
        event.response.body = event.response.body.concat([
            [ 'Origin-Host', 'pgw1.hackaton.uisi.ru' ],
            [ 'Origin-Realm', 'hackaton.uisi.ru' ],
            [ 'Result-Code', 'DIAMETER_SUCCESS' ],
            [ 'Supported-Vendor-Id', 10415 ]
        ]);
        event.callback(event.response);
        // socket.diameterConnection.end();
    }
});

d_socket.on('error', function(err) {
    console.log(err);
});