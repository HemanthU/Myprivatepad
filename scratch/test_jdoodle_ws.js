const WebSocket = require('ws');
const fetch = require('node-fetch');

async function test() {
  const tokenRes = await fetch('https://api.jdoodle.com/v1/auth-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: '1208f075a175f1b376110ff53ca4b933',
      clientSecret: 'bbff87a718ac2818652ca476057e4fc77dddf4b2c9f8fb2e6c0c0977febd1f41'
    })
  });
  const token = await tokenRes.text();
  console.log("Token:", token);

  const ws = new WebSocket('wss://api.jdoodle.com/v1/ws/execute');

  ws.on('open', () => {
    console.log('Connected');
    ws.send(JSON.stringify({
      script: 'import java.util.Scanner; public class Main { public static void main(String[] args) { Scanner sc = new Scanner(System.in); System.out.println("Enter:"); System.out.println("You entered: " + sc.nextInt()); } }',
      language: 'java',
      versionIndex: '4',
      token: token
    }));
  });

  ws.on('message', (data) => {
    console.log('Received:', data.toString());
    const msg = JSON.parse(data.toString());
    if (msg.output && msg.output.includes('Enter:')) {
      setTimeout(() => {
        console.log("Sending input 42");
        ws.send(JSON.stringify({
          input: '42\n'
        }));
      }, 500);
    }
  });

  ws.on('close', () => console.log('Closed'));
}
test();
