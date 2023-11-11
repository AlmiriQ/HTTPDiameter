from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import httpx
from datetime import datetime


class User(BaseModel):
	MSISDN: str
	code_network: str = 'Home'
	timezone: str = 'GMT+5'
	mcc: str = 999
	mnc: str = 99
	MSIN: str
	IMEI: str
	SESSION_ID: str

app = FastAPI()


def to_avp(json):
	json = {
			  "subscriptionId": [{
			    "subscriptionIdType": 'END_USER_IMSI',
			    "subscriptionIdData": json.MSISDN
			  }, {
			    "subscriptionIdType": 'END_USER_E164',
			    "subscriptionIdData": json.mcc + json.mnc + json.MSIN
			  }],
			  "userName": 'hackaton',
			  "ccRequestType": 'INITIAL_REQUEST',
			  "sessionId": json.SESSION_ID,
			  "serviceInformation": {
			  	'psInformation': {
				  	"3gppChargingId": 'abc123',
				  	"pdnConnectionChargingId": 2882343476,
				  	"3gppPdpType": 'IPv4',
				  	"pdpAddress": '1.1.1.1',
				  	"dynamicAddressFlag": 'Dynamic',
				  	"sgsnAddress": '2.2.2.2',
				  	"ggsnAddress": '3.3.3.3',
				  	"servingNodeType": 'GTPSGW',
				  	"3gppImsiMccMnc": json.mcc + json.mnc,
				  	"3gppGgsnMccMnc": json.mcc + json.mnc,
				  	"3gppNsapi": '5',
				  	"3gppSelectionMode": '0',
				  	"3gppChargingCharacteristics": '0900',
				  	"3gppSgsnMccMnc": json.mcc + json.mnc,
				  	"3gppMsTimezone": json.timezone,
				  	"3gppUserLocationInfo": f'MCC {json.mcc} Private network, MNC {json.mnc} Internal use, example, testing, ECGI 0x1d60d01',
				  	"3gppRatType": '06000000',
				  	"calledStationId": 'internet.hackaton.uisi.ru',
				  	"startTime": datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')
			  	}
			  }
			}
	return json

def to_readable(json):
	return json


@app.post("/CCR-Init/")
async def init(user: User):
	user = to_avp(user)

	async with httpx.AsyncClient() as client:
		response = await client.post("http://198.19.0.200:8000", json=user)

	return to_readable(response.json())

@app.put("/CCR-Update/")
async def update(user: User):

	user = to_avp(user)
	async with httpx.AsyncClient() as client:
		response = await client.put("http://198.19.0.200:8000", json=user.model_dump_json())

	return to_readable(response.json())

@app.delete("/CCR-Terminate/")
async def delete(userid: int):

	async with httpx.AsyncClient() as client:
		response = await client.delete("http://198.19.0.200:8000", json={'userid': userid})
	return {'status': 'ok'}