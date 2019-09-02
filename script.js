const wait = (ms) => new Promise(res => setTimeout(() => res(), ms))
const download = function(content, fileName, mimeType) {
    var a = document.createElement('a');
    mimeType = mimeType || 'application/octet-stream';

    if (navigator.msSaveBlob) { // IE10
        navigator.msSaveBlob(new Blob([content], {
            type: mimeType
        }), fileName);
    } else if (URL && 'download' in a) { //html5 A[download]
        a.href = URL.createObjectURL(new Blob([content], {
            type: mimeType
        }));
        a.setAttribute('download', fileName);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else {
        location.href = 'data:application/octet-stream,' + encodeURIComponent(content); // only this mime type is supported
    }
}

let targetHeight = 64
let targetWidth = 64

async function start() {

    if(!navigator.mediaDevices.getUserMedia) {
        alert("Dieser Browser wird nicht unterstützt.")
        return
    }

    const videoElement = document.querySelector("#usermedia")
    const canvasElement = document.querySelector("#canvas")
    const counterElement = document.querySelector("#counter")
    const previewElement = document.querySelector("#previewarea")
    const ctx = canvasElement.getContext("2d")

    const sizeElement = document.querySelector("#inputsize")
    const sizeEcho = document.querySelector("#copysize")

    sizeElement.onchange = (e) => {
        const val = parseInt(e.target.value)
        targetHeight = val
        targetWidth = val
        sizeEcho.innerHTML = val.toString()
    }


    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        .catch(() => {
            alert("Bitte erlaube dieser Seite den Kamerazugriff.")
        })
    videoElement.srcObject = stream

    const capture = (img = null) => {
        canvasElement.height = targetHeight
        canvasElement.width = targetWidth
        
        const sAspect = videoElement.getBoundingClientRect().width / videoElement.getBoundingClientRect().height
        const dAspect = targetWidth / targetHeight

        if(sAspect > dAspect) {
            const width = targetWidth * videoElement.getBoundingClientRect().height / targetHeight
            const left  = (videoElement.getBoundingClientRect().width - width) / 2
            ctx.drawImage(videoElement, 
                    left, 0, width, videoElement.getBoundingClientRect().height, 
                    0, 0, targetWidth, targetHeight)
        } else {
            const height = targetHeight * videoElement.getBoundingClientRect().width / targetWidth
            const top  = (videoElement.getBoundingClientRect().height - height) / 2
            ctx.drawImage(videoElement, 
                    0, top, videoElement.getBoundingClientRect().width, height, 
                    0, 0, targetWidth, targetHeight)
        }
        

        const data = ctx.getImageData(0, 0, targetWidth, targetHeight)
        const readData = (x, y) => {
            const index = 4 * (x + y * targetWidth)
            const number = data.data[index] + data.data[index + 1] + data.data[index + 2]
            return Math.round(number / 3)
        }

        const targetArray = new Uint8Array(targetWidth * targetHeight)
        for(let x = 0; x < targetWidth; x++)
            for(let y = 0; y < targetHeight; y++) 
                targetArray[x + targetWidth * y] = readData(x, y)

        // TESTING
        if(img) {
            for(let x = 0; x < targetWidth; x++)
                for(let y = 0; y < targetHeight; y++) {
                    const index = 4 * (x + y * targetWidth)
                    data.data[index] = targetArray[x + y * targetWidth]
                    data.data[index+1] = targetArray[x + y * targetWidth]
                    data.data[index+2] = targetArray[x + y * targetWidth]
                    data.data[index+3] = 255
                }
            ctx.putImageData(data, 0, 0)
            img.src = canvas.toDataURL('image/png')
        }
 
        return (targetArray)
    }

    const shutter = async () => {
        const number =  parseInt(document.querySelector("#inputnumber").value)
        const time = 1000 * parseFloat(document.querySelector("#inputtime").value)
        counterElement.classList.add("active")

        let counter = 0
        const images = []
        const imageContainers = []

        // PREVIEW
        while(previewElement.firstChild)
            previewElement.removeChild(previewElement.firstChild)

        for(let i = 0; i < number; i++) {
            imageContainers[i] = document.createElement("img")
            previewElement.append(imageContainers[i])
        }

        images[0] = capture(imageContainers[0])
        counterElement.innerHTML = counter + 1
        while(++counter < number) {
            await wait(time)
            images[counter] = capture(imageContainers[counter])
            counterElement.innerHTML = counter + 1
        }

        previewElement.onclick = () => {
            const content = images.map(image => image.map(number => `${number}`).join(",")).join("\n")
            download(content, "output.csv", "text/csv")
        }
        setTimeout(() => counterElement.classList.remove("active"), 2000)        
    }
    videoElement.onclick = shutter

}