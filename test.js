/**
 * TODO. navigator 参照
 * https://developer.mozilla.org/ja/docs/Web/API/Serial
 * Web Serial API の Serial インターフェイスは、
 * ウェブページがシリアルポートを検出し、接続するためのプロパティやメソッドを提供します。
 * 
 */

let port;               // シリアルポート
let reader;             // データ受信
let writer;             // データ送信
let keepReading = true; // 解除までにデータを受信する

// 《ポート連結》ボタン押下した時のイベント
document.getElementById("connect").addEventListener("click", async () => {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });

        writer = port.writable.getWriter();
        reader = port.readable.getReader();

        keepReading = true;
        readLoop();

        document.getElementById("disconnect").disabled = false;
        console.log("ポート連結済み");
    } catch (err) {
        console.error("連結エラー:", err);
    }
});

// 《連結解除》ボタン押下した時のイベント
document.getElementById("disconnect").addEventListener("click", async () => {
    keepReading = false;
    if (reader) await reader.cancel();
    if (reader) reader.releaseLock();
    if (writer) writer.releaseLock();
    await port.close();
    console.log("ポート連結解除済み");
});

// 《転送》ボタン押下した時のイベント
document.getElementById("send").addEventListener("click", async () => {
    const text = document.getElementById("sendText").value;
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(text + "\r\n")); // 計量器終了文字注意
});


async function readLoop() {
    const decoder = new TextDecoder();
    while (keepReading) {
        try {
            const { value, done } = await reader.read();
            if (done) break;
            document.getElementById("receive").value += decoder.decode(value);
        } catch (error) {
            console.error("受信エラー:", error);
            break;
        }
    }
}