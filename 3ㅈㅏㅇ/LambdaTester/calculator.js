exports.handler = (event, context, callback) => {
  console.log("Lambda 함수 " + context.functionName + "의 버전 1");
  console.log("두 개의 숫자와 하나의 연산자를 받는 예제");

  console.log('Received event:', JSON.stringify(event, null, 2));
  var error, result;

  if (isNaN(event.num1) || isNaN(event.num2)) {
    console.error("유효하지 않은 숫자"); // 로깅
    // error = new Error("유효하지 않은 숫자!"); // 예외 처리
    return callback("유효하지 않은 숫자");
  }

  // 연산자는 +, -, /, *, add, sub, mul, div 값 중 하나
  switch (event.operand) {
    case "+":
    case "add":
      result = event.num1 + event.num2;
      break;
    case "-":
    case "sub":
      result = event.num1 - event.num2;
      break;
    case "*":
    case "mul":
      result = event.num1 * event.num2;
      break;
    case "/":
    case "div":
      if (event.num2 === 0) {
        console.error("나눗셈의 제수는 0이 될 수 없다.");
        //error = new Error("나눗셈의 제수는 0이 될 수 없다.");
        return callback("나눗셈의 제수는 0이 될 수 없다.");
      } else {
        result = event.num1 / event.num2;
      }
      break;
    default:
      return callback("유효하지 않은 연산자");
      break;
  }
  console.log("결과 : " + result);
  return callback(null, result);
  // 호출자에게 결과를 전달한다. 전달된 결과는 CloudWatch 로그가 아닌
  // RequestResponse 호출 후에 실행 로그에 출력된다.
};

//************************************	EVENT 	**********************************************************
/*{
    "num1": 3,
    "num2": 0,
    "operand": "div"
}*/
