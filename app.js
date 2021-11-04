const Koa = require('koa');
const koaRouter = require('@koa/router');
const koaBody = require('koa-body');
const axios = require('axios');
const app = new Koa();

const router = new koaRouter()

const getLocationUrl = async (originUrl) => {
  try {
    const res = await axios({
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_1_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/16D57 Version/12.0 Safari/604.1'
      },
      url: originUrl,
      maxRedirects: 0,
      timeout: 1000,
    })

    if (res && res.status === 200) {
      return originUrl
    }
  } catch(err) {
    if (err && err.response && err.response.status === 302) {
      return err.response.headers.location
    } else {
      throw err
    }
  }
  return null
}

const getItemId = (url) => {
  const reg = /video\/(\w*)/i
  const matchArr = url.match(reg)
  if (matchArr && matchArr.length) {
    return matchArr[1]
  }
  return null
}

const revomeWaterMask = async (ctx) => {
  try {
    const url = await getLocationUrl(ctx.request.body.url)
    const itemId = getItemId(url)

    const { data: videoJson } = await axios(`https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${itemId}`);
    
    // const uriId = videoJson.item_list[0].video.play_addr.uri;
    const urlList = videoJson.item_list[0].video.play_addr.url_list;
    const shareTitle = videoJson.item_list[0].share_info.share_title;
    const coverImg = videoJson.item_list[0].video.cover.url_list[0];
    const videoUrl = await getLocationUrl(urlList[0].replace('playwm', 'play'))
    ctx.body = {
      videoUrl,
      videoTitle: shareTitle,
      coverImg,
    }
  } catch(e) {
    ctx.body = {
      message: '解析失败'
    }
  }
  
}

const ksParse = async (ctx) => {
  try {
    const url = await getLocationUrl(ctx.request.body.url)
  
    const res = await axios({
      url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_1_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/16D57 Version/12.0 Safari/604.1'
      },
    })

    const html = res.data

    const regVideo = /\"srcNoMark\"\:\"(http.+?)\"/
    const regCover = /\"poster\"\:\"(http.+?)\"/
    const regTitle = /\"caption\"\:\"(.+?)\"/


    const videoUrl = html.match(regVideo)[1]
    const coverImg = html.match(regCover)[1]
    const videoTitle = html.match(regTitle)[1]
    
    
    ctx.body = {
      videoUrl,
      videoTitle,
      coverImg,
    }
  } catch(e) {
    ctx.body = {
      message: '解析失败'
    }
  }
  
}

// 两个api
router.post('/watermask', revomeWaterMask)
router.post('/ksParse', ksParse)
router.get('/video', async (ctx) => {
  const res = await axios({
    url: ctx.query.url,
    responseType: 'stream'
  })
  ctx.set('content-type', 'video/mp4')
  ctx.set('Content-disposition', `attachment; filename=${Date.now()}.mp4`)
  ctx.set('Content-Length', res.headers['content-length'])
  
  ctx.body = res.data
})
router.get('/', async ctx => {
  ctx.body = '200'
})

app.use(koaBody())
app.use(router.routes()).use(router.allowedMethods());

app.listen(4000);