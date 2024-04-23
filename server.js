const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');

const client_redis = redis.createClient();

const { OPCUAClient, AttributeIds, DataType, VariantArrayType } = require("node-opcua-client");

const endpointUrl = "opc.tcp://10.10.10.91:4840";

const app = express();

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.post('/opc_write', async (req, res) => {
    const nodeId = req.body.nodeId;
    const value = req.body.value;

    const client = OPCUAClient.create({ endpointMustExist: false });
    try{
        await client.connect(endpointUrl);
        console.log("Connected to the OPC UA server at", endpointUrl);

        const session = await client.createSession();
        console.log("Session created");

        await SendData(session, nodeId, value);
        await client.disconnect();
        res.status(200).send('POST request received successfully.');
    } catch (error) {
        console.error("Initialization failed:", error);
        await client.disconnect();
        res.status(500).json({ error: 'An error occurred' });
    }
});

app.post('/batchid', async (req, res) => {
    const mixerId = req.body.mixerId;
    const value = req.body.value;

    try{
        await client_redis.connect();
        await client_redis.set(mixerId, value);
        res.status(200).send('POST request received successfully.');
    } catch (error) {
        console.error("Initialization failed:", error);
        await client_redis.disconnect();
        res.status(500).json({ error: 'An error occurred' });
    }
});

async function SendData(session, nodeId, value) {
    const node_id_array = {
        'AP_LotNo' : 'ns=6;s=::APWrite:WriteData.LotNo',
        'CP_LotNo' : 'ns=6;s=::CPWrite:WriteData.LotNo',
        'AS_LotNo' : 'ns=6;s=::ASWrite:WriteData.LotNo',
        'CS_LotNo' : 'ns=6;s=::CSWrite:WriteData.LotNo',
        'AC_LotNo' : 'ns=6;s=::ACWrite:WriteData.LotNo',
        'CC_LotNo' : 'ns=6;s=::CCWrite:WriteData.LotNo',
    }
    try {
      function stringToIntArray(str) {
        const maxLength = 32; // 최대 길이를 32로 설정합니다.
        const intArray = new Int16Array(maxLength).fill(0); // 최대 길이의 배열을 생성하고 0으로 채웁니다.
    
        for (let i = 0; i < str.length && i < maxLength; i++) {
            const charCode = str.charCodeAt(i);
            intArray[i] = charCode;
        }
    
        return intArray;
      }

      const intArray = stringToIntArray(value);
      
      const statusCode = await session.write({
          nodeId: node_id_array[nodeId], 
          attributeId: AttributeIds.Value,
          value: {
              value: {
                  dataType: DataType.Int16,
                  arrayType: VariantArrayType.Array,
                  value: intArray
              }
          }
      });
      
      console.log("Write result:", statusCode);
      } catch (error) {
          console.error('데이터 수집 및 전송 중 오류 발생:', error);
      }
  }

const PORT = process.env.PORT || 6000;
const HOST = '10.10.10.51'
app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}.`);
});