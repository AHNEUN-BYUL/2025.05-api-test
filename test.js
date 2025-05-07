let port;
let reader;
let writer;
let keepReading = true;

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

document.getElementById("disconnect").addEventListener("click", async () => {
    keepReading = false;
    if (reader) await reader.cancel();
    if (reader) reader.releaseLock();
    if (writer) writer.releaseLock();
    await port.close();
    console.log("ポート連結解除済み");
});

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