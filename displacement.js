Array.prototype.split = function(stride) {
    const length = Math.floor(this.length / stride)
    const array = []
    for(let i = 0; i < length; i++) {
        array.push([])
        for(let j = 0; j < stride; j++) {
            array[i].push(this[i * stride + j])
        }
    }
    return array
}

const readCSV = (file) => new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onload = (file => {
        const text = file.target.result
        const array = text.split("\n").map(line => line.split(",").map(number => parseFloat(number)))
        res(array)
    })
    reader.readAsText(file)
})

const displace = (img, height, width, u, v, scale = 1.0) => {
    const nImgG = new Uint8Array(img.length)
    const nImgA = new Float32Array(img.length)

    const filterSize = 2
    const intensityFunc = (dist, travel) => (filterSize - dist) * travel

    const addPoint = (ix, iy, x, y, color, travel) => {
        if(ix < 0 || iy < 0 || ix >= width || iy >= height) return
        
        const index = iy * width + ix
        const intensity = intensityFunc(Math.sqrt(Math.pow(ix-x, 2) + Math.pow(iy-y, 2)), travel)
        if(intensity <= 0) return

        //console.log("ADD POINT", ix, iy, x, y, color, intensity)

        const oldIntensity = nImgA[index]
        const combinedIntensity = oldIntensity + intensity

        //console.log("OLD", oldIntensity, "COMB", combinedIntensity, nImgG[index] * oldIntensity / combinedIntensity + color * intensity / combinedIntensity)

        nImgG[index] = Math.round(nImgG[index] * oldIntensity / combinedIntensity + color * intensity / combinedIntensity)
        nImgA[index] = combinedIntensity
    }

    const addRegion = (x, y, color, travel) => {
        //console.log("ADD REGION", x, y, color)
        const ix = Math.round(x)
        const iy = Math.round(y)

        for(let dx = -filterSize; dx <= filterSize; dx++)
        for(let dy = -filterSize; dy <= filterSize; dy++) {
            addPoint(ix + dx, iy + dy, x, y, color, travel)
        }
    }

    for(let x = 0; x < width; x++)
    for(let y = 0; y < height; y++) {
        const index = y * width + x
        const ci = img[index]
        const cu = u[y][x] * width * scale
        const cv = v[y][x] * height * scale

        const tx = x + cu
        const ty = y + cv
        const travel = Math.sqrt(Math.pow(cu, 2) + Math.pow(cv, 2))

        addRegion(tx, ty, ci, travel)
    }
    
    const canvas = document.createElement("canvas")
    canvas.height = height
    canvas.width = width
    const context = canvas.getContext("2d")
    const data = context.getImageData(0, 0, width, height)
    for(let x = 0; x < width; x++)
    for(let y = 0; y < height; y++) {
        const index = (y * width + x)
        data.data[index*4] = nImgG[index]
        data.data[index*4+1] = nImgG[index]
        data.data[index*4+2] = nImgG[index]
        data.data[index*4+3] = 255
    }
    context.putImageData(data, 0, 0)
    return canvas.toDataURL('image/png')
}


const fileinput = document.querySelector("#fileinput")
fileinput.onchange = async (e) => {
    const { files } = e.target
    if(files.length != 3)
        return

    const imgs = await readCSV(Array.from(files).find(file => file.name.startsWith("imseq")))
    const u = await readCSV(Array.from(files).find(file => file.name.startsWith("u_")))
    const v = await readCSV(Array.from(files).find(file => file.name.startsWith("v_")))

    const width = 64
    const height = 64

    const us = []
    const vs = []

    const tmpU = u.map(row => row.split(width))
    const tmpV = v.map(row => row.split(width))

    for(let i = 0; i < imgs.length; i++) {
        us.push([])
        vs.push([])

        for(let y = 0; y < height; y++) {
            us[i].push(tmpU[y][i])
            vs[i].push(tmpV[y][i])
        }
    }

    const img = document.querySelector("#image")

    let scale = 0
    const loop = () => {
        scale += .01
        if(scale > 1) scale = 0
        img.src = displace(imgs[0], 64, 64, us[0], vs[0], scale)
        requestAnimationFrame(loop)
    }
    loop()
}