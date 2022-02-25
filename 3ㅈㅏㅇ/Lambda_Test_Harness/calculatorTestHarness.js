'use strict';

/**
 * Lambda 함수에 다양한 테스트를 수행하기 위해 다음 권한을 실행 역할(role)에 추가해야 한다.
 * 'lambda : InvokeFunction' 권한
 * 'dynamodb : PutItem' 권한
*/
const AWS = require('aws-sdk');
const doc = require('dynamodb-doc');

const lambda = new AWS.Lambda({ apiVersion: '2015-03-31' });
const dynamo = new doc.DynamoDB();

// 지정된 함수를 비동기 방식으로 N번 실행한다.
const asyncAll = (opts) => {
    let i = -1;
    const next = () => {
        i++;
        if (i === opts.times) {
            opts.done();
            return;
        }
        opts.fn(next, i);
    };
    next();
};


/**
 * 함수를 호출하고 결과를 DynamoDB 테이블(event.resultsTable)에 입력한다.
 * 해당 테이블에는 "testId"라느 해시키 문자열과 "iteration"이라는 범위 키 숫자가 있어야 한다.
 * 각 단위 테스트의 실행을 구분하기 위해 'event.testId'를 지정하자.
 */
const unit = (event, callback) => {
    const lambdaParams = {
        FunctionName: event.function,
        Payload: JSON.stringify(event.event),
    };
    console.log("입력받은 테스트 이벤트 : ", event.event);
    lambda.invoke(lambdaParams, (err, data) => {
        if (err) {
            return callback(err);
        }
        // Dynamo 테이블에 결과를 입력한다.
        const dynamoParams = {
            TableName: event.resultsTable,
            Item: {
                testId: event.testId,
                iteration: event.iteration || 0,
                result: data.Payload,
                passed: !Object.prototype.hasOwnProperty.call(JSON.parse(data.Payload), 'errorMessage'),
            },
        };
        console.log("테스트 통과 : "+dynamoParams.Item.passed);
        dynamo.putItem(dynamoParams, callback);
    });
};

/**
 * 지정된 함수를 비동기 방식으로 'event.iterations'만큼 실행한다.
 */
const load = (event, callback) => {
    const payload = event.event;
    asyncAll({
        times: event.iterations,
        fn: (next, i) => {
            payload.iteration = i;
            const lambdaParams = {
                FunctionName: event.function,
                InvocationType: 'Event',
                Payload: JSON.stringify(payload),
            };
            lambda.invoke(lambdaParams, next);
        },
        done: () => callback(null, '부하 테스트 완료!'),
    });
};


const ops = {
    unit,
    load,
};

/**
 * 'event.operation'에는 'unit' 또는 'load'라는 테스트 유형을,
 * 'event.function'에는 테스트할 Lambda 함수 이름을 전달하고
 * 'event.event'를 사용해 함수를 호출한다.
 *
 * 각 테스트 유형에 대한 자세한 내용은 위의 내용을 참고하자.
 */
exports.handler = (event, context, callback) => {
    if (Object.prototype.hasOwnProperty.call(ops, event.operation)) {
        ops[event.operation](event, callback);
    } else {
        callback(`유효하지 않은 연산자 : "${event.operation}"`);
    }
};

/*
EVENT:
{
  "operation": "unit",
  "function": "myCalculator",
  "resultsTable": "unit-test-results",
  "iteration": 1,
  "testId": "MyTestRun1",
  "event": {
    "num1": 3,
    "num2": 2,
    "operand": "div"
  }
}
*/
