'use strict';

/**
 * 슬랙 웹훅 구성을 위해 다음 단계를 따르자.
 *
 *   1. https://<your-team-domain>.slack.com/services/new 접속
 *
 *   2. "Incoming WebHooks" 검색 및 선택
 *
 *   3. 메시지 전송을 위한 채널을 선택하고 "Add Incoming WebHooks Integration"를 선택
 *
 *   4. 설정 화면에서 웹훅 URL를 복사하고 다음 단계에서 사용
 *
 *
 * 키를 암호화하려면 다음 단계를 따르자.
 *
 *  1. KMS 키를 만들거나 기존에 존재하는 키를 사용한다. - http://docs.aws.amazon.com/ko_kr/kms/latest/developerguide/create-keys.html
 *
 *  2. "전송 중 암호화용 헬퍼 활성화" 선택박스 체크
 *
 *  3. 환경 변수의 kmsEncryptedHookUrl에 웹훅 URL를 복사하고 암호화한다.
 *
 *  주의사항: 웹훅 URL에는 프로토콜을 제외해야 한다. (예: "hooks.slack.com/services/abc123").
 *
 *  4. kms:Decrypt 권한을 함수 역할에 지정한다.
 *      예 :

{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "Stmt1443036478000",
            "Effect": "Allow",
            "Action": [
                "kms:Decrypt"
            ],
            "Resource": [
                "<KMS 키 ARN>"
            ]
        }
    ]
}
 */

const AWS = require('aws-sdk');
const url = require('url');
const https = require('https');
// 환경 변수 kmsEncryptedHookUrl에 저장된 base64로 암호화된 키(CiphertextBlob)
const kmsEncryptedHookUrl = process.env.kmsEncryptedHookUrl;
// 환경 변수 slackChannel에 저장된 메시지를 전송할 슬랙 채널
const slackChannel = process.env.slackChannel;
let hookUrl;

function postMessage(message, callback) {
  const body = JSON.stringify(message);
  const options = url.parse(hookUrl);
  options.method = 'POST';
  options.headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  };
  //console.log("options: ", options);
  const postReq = https.request(options, (res) => {
    const chunks = [];
    res.setEncoding('utf8');
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      if (callback) {
        callback({
          body: chunks.join(''),
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
        });
      }
    });
    return res;
  });

  postReq.write(body);
  postReq.end();
}

function processEvent(event, callback) {
  const message = JSON.parse(event.Records[0].Sns.Message);
  const alarmName = message.AlarmName;
  //var oldState = message.OldStateValue;
  const newState = message.NewStateValue;
  const reason = message.NewStateReason;

  const slackMessage = {
    channel: slackChannel,
    text: `${alarmName} 상태는 현재 ${newState} : ${reason}`,
  };
  console.log("슬랙 메시지 : ", slackMessage);
  postMessage(slackMessage, (response) => {
    if (response.statusCode < 400) {
      console.info('메시지 발송 성공');
      callback(null);
    } else if (response.statusCode < 500) {
      console.error(`슬랙 API에 메시지 전송 오류 : ${response.statusCode} - ${response.statusMessage}`);
      callback(null); // 오류는 요청 문제로 발생했으니 재시도하지 않는다.
    } else {
      // Lambda 함수를 재실행한다.
      callback(`메시지 처리 중 발생한 서버 오류 : ${response.statusCode} - ${response.statusMessage}`);
    }
  });
}

exports.handler = (event, context, callback) => {
  console.log("EVENT: ", JSON.stringify(event));
  if (hookUrl) {
    // 컨테이너 재사용, 단순히 메모리에 있는 키로 이벤트를 처리한다.
    processEvent(event, callback);
  } else if (kmsEncryptedHookUrl && kmsEncryptedHookUrl !== '<kmsEncryptedHookUrl>') {
    const encryptedBuf = new Buffer(kmsEncryptedHookUrl, 'base64');
    const cipherText = {
      CiphertextBlob: encryptedBuf
    };

    const kms = new AWS.KMS();
    kms.decrypt(cipherText, (err, data) => {
      if (err) {
        console.log('Decrypt error:', err);
        return callback(err);
      }
      hookUrl = `https://${data.Plaintext.toString('ascii')}`;
      processEvent(event, callback);
    });
  } else {
    callback('훅 URL이 설정되지 않았음');
  }
};
