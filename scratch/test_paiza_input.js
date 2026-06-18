const fetch = require('node-fetch'); // if needed, but fetch is global in Node 18+

const code = `
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.println("V:");
        int n = sc.nextInt();
        System.out.println("N is " + n);
        int m = sc.nextInt();
        System.out.println("M is " + m);
    }
}
`;

const input = `5
0`;

fetch('https://api.paiza.io/runners/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source_code: code,
    language: 'java',
    input: input,
    api_key: 'guest'
  })
}).then(r => r.json()).then(async d => {
  const id = d.id;
  await new Promise(res => setTimeout(res, 2000));
  const res = await fetch('https://api.paiza.io/runners/get_details?id=' + id + '&api_key=guest');
  console.log(await res.json());
});
