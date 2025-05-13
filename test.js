/**
 * TODO. navigator 参照
 * https://developer.mozilla.org/ja/docs/Web/API/Serial
 * Web Serial API の Serial インターフェイスは、
 * ウェブページがシリアルポートを検出し、接続するためのプロパティやメソッドを提供します。
 * 
 */

// * パラメータ整理
let ports = [];                 // 連結されたポート保存
let readers = [];               // 各ポートのリーダー保存
let writers = [];               // 各ポートのライター保存
let names = [];                 // ユーザーが指定したポート名保存
let currentPortIndex = null;    // 現在選択されているポートインデックス
let keepReading = false;        // 受信ループフラグ

// * HTML要素参照
const portList = document.getElementById("portList");
const portNameInput = document.getElementById("portName");
const disconnectBtn = document.getElementById("disconnect");
const receiveArea = document.getElementById("receive");

// *《ポート連結》ボタン押下した時のイベント
document.getElementById("connect").addEventListener("click", async () => {
    const name = portNameInput.value.trim();
    // * ポート名が空白の場合
    if (!name) {
        alert("ポート名を入力してください。");
        return;
    }

    try {
        /**
         * * 注意点
         * * １．navigator.serial.requestPort()は既にユーザーが許可したポートのみ返還します。
         * * ２．baudRate（ボーレート）はデータ転送される速度で、指定値は装備（連結ポート）設定と一致必須です。
         */
        const selectedPort = await navigator.serial.requestPort();
        await selectedPort.open({ baudRate: 9600 });

        // * ポートが開かれたら、ポートの読み書き用のリーダーとライターを作成
        const index = ports.length;
        ports.push(selectedPort);
        writers[index] = selectedPort.writable.getWriter();
        readers[index] = selectedPort.readable.getReader();
        // * ユーザーが指定したポート名も保存
        names[index] = name;

        // * 新しいポートが追加された場合、ポートリストにオプションを追加
        const option = document.createElement("option");
        option.value = index;
        option.textContent = name;
        portList.appendChild(option);
        portList.value = index;

        // * 現在のポートインデックスを更新及び連結解除ボタンを有効化
        currentPortIndex = index;
        disconnectBtn.disabled = false;
        keepReading = true;

        // * 受信ループ開始
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
    // * ポートが選択されていない場合、連結解除ボタンを無効化
    disconnectBtn.disabled = currentPortIndex == null;
});

// *《転送》ボタン押下した時のイベント
document.getElementById("send").addEventListener("click", async () => {
    if (currentPortIndex == null) return;
    const text = document.getElementById("sendText").value;
    // * TextEncoderは文字列をUint8Arrayに変換するためのAPI
    const encoder = new TextEncoder();
    // * \r\nは改行コード、計量器の命令語終了のため
    await writers[currentPortIndex].write(encoder.encode(text + "\r\n"));
});

// *《連結解除》ボタン押下した時のイベント
disconnectBtn.addEventListener("click", async () => {
    // * 現在選択されているポートがない場合、何もしない
    if (currentPortIndex == null) return;
    const port = ports[currentPortIndex];
    const name = names[currentPortIndex];

    try {
        // * 受信ループ停止
        keepReading = false;

        await readers[currentPortIndex].cancel();   // リーダーをキャンセル
        readers[currentPortIndex].releaseLock();    // リーダーリソース解除
        writers[currentPortIndex].releaseLock();    // ライターリソース解除
        await port.close();                         // ポートを閉じる

        // * UI 整理、ポートリストから削除
        const option = portList.querySelector(`option[value="${currentPortIndex}"]`);
        if (option) portList.removeChild(option);
        // * 内部データ整理、UIリセット
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
/**
 * * ポートからデータを読み取り続ける非同期関数です。
 * * 受信したデータは、テキストデコーダーを使用して文字列に変換され、
 * * テキストエリアに追加されます。
 */
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