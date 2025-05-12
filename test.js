/**
 * TODO. navigator 参照
 * https://developer.mozilla.org/ja/docs/Web/API/Serial
 * Web Serial API の Serial インターフェイスは、
 * ウェブページがシリアルポートを検出し、接続するためのプロパティやメソッドを提供します。
 * 
 */

// * パラメータ整理
let ports = [];
let readers = [];
let writers = [];
let names = [];
let currentPortIndex = null;
let keepReading = false;

// * HTML要素参照
const portList = document.getElementById("portList");
const portNameInput = document.getElementById("portName");
const disconnectBtn = document.getElementById("disconnect");
const receiveArea = document.getElementById("receive");

// *《ポート連結》ボタン押下した時のイベント
document.getElementById("connect").addEventListener("click", async () => {
    const name = portNameInput.value.trim();
    if (!name) {
        alert("ポート名を入力してください。");
        return;
    }

    try {
        /**
         * * 注意点
         * * １．navigator.serial.requestPort()は既にユーザーが許可したポートのみ返還します。
         * * ２．baudRate（ボーレート）はデータ転送される速度で、指定値は連結ポート設定と一致必須です。
         */
        const selectedPort = await navigator.serial.requestPort();
        await selectedPort.open({ baudRate: 9600 });

        const index = ports.length;
        ports.push(selectedPort);
        writers[index] = selectedPort.writable.getWriter();
        readers[index] = selectedPort.readable.getReader();
        names[index] = name;

        // * ポート名設定作業
        const option = document.createElement("option");
        option.value = index;
        option.textContent = name;
        portList.appendChild(option);
        portList.value = index;

        currentPortIndex = index;
        disconnectBtn.disabled = false;
        keepReading = true;

        readLoop(index);
        console.log(`「${name}」ポート接続完了`);
    } catch (err) {
        console.error("連結エラー:", err);
    }
});
// * ポート選択の場合
portList.addEventListener("change", (e) => {
    const idx = parseInt(e.target.value);
    currentPortIndex = isNaN(idx) ? null : idx;
    disconnectBtn.disabled = currentPortIndex == null;
});

// *《転送》ボタン押下した時のイベント
document.getElementById("send").addEventListener("click", async () => {
    if (currentPortIndex == null) return;
    const text = document.getElementById("sendText").value;
    const encoder = new TextEncoder();
    await writers[currentPortIndex].write(encoder.encode(text + "\r\n"));
});

// *《連結解除》ボタン押下した時のイベント
disconnectBtn.addEventListener("click", async () => {
    if (currentPortIndex == null) return;
    const port = ports[currentPortIndex];
    const name = names[currentPortIndex];

    try {
        keepReading = false;

        await readers[currentPortIndex].cancel();
        readers[currentPortIndex].releaseLock();
        writers[currentPortIndex].releaseLock();
        await port.close();

        // * UI 整理
        const option = portList.querySelector(`option[value="${currentPortIndex}"]`);
        if (option) portList.removeChild(option);

        ports[currentPortIndex] = null;
        readers[currentPortIndex] = null;
        writers[currentPortIndex] = null;
        names[currentPortIndex] = null;
        currentPortIndex = null;

        portList.value = "";
        disconnectBtn.disabled = true;

        console.log(`「${name}」ポート解除完了`);
    } catch (e) {
        console.log("ポート解除失敗", e);
    }
});

// * 受信ループ
async function readLoop(index) {
    const decoder = new TextDecoder();
    while (keepReading && readers[index]) {
        try {
            const { value, done } = await readers[index].read();
            if (done) break;
            receiveArea.value += decoder.decode(value);
        } catch (error) {
            console.error("受信エラー:", error);
            break;
        }
    }
}