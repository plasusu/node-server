const Koa = require('koa');
const koaRouter = require('@koa/router');
const koaBody = require('koa-body');
const axios = require('axios');
const app = new Koa();

const router = new koaRouter()


const getLocationUrl = async (originUrl) => {
  try {
    await axios({
      url: originUrl,
      maxRedirects: 0,
      timeout: 1000,
    })
  } catch(err) {
    console.log(err)
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



// 云函数入口函数
const revomeWaterMask = async (ctx) => {
  try {
    console.log(ctx.request.body)
    const url = await getLocationUrl(ctx.request.body.url)
    const itemId = getItemId(url)
    console.log(url)

    const { data: videoJson } = await axios(`https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${itemId}`);
    
    // const uriId = videoJson.item_list[0].video.play_addr.uri;
    const urlList = videoJson.item_list[0].video.play_addr.url_list;
    const shareTitle = videoJson.item_list[0].share_info.share_title;
    const coverImg = videoJson.item_list[0].video.cover.url_list[0];
    const videoUrl = await getLocationUrl(urlList[0].replace('playwm', 'play'))
    console.log(urlList[0], shareTitle, coverImg)
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

router.get('/', async ctx => {
  ctx.body = '200'
})
router.post('/watermask', revomeWaterMask)
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

app.use(koaBody())
app.use(router.routes()).use(router.allowedMethods());

app.listen(4000);