const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
var db = require('../db');
const bodyParser = require('body-parser');
const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');

router.get('/', function(req, res, next) {
        console.log("실행됨?")
  });

async function scrape(query) {
 


    let browser;
    const results = [];
    try {
        browser = await puppeteer.launch({
            headless: true,
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        });

        const page = await browser.newPage();
        await page.goto('https://thinkyou.co.kr/contest/');

        // 검색어 입력
        await page.type('input[name="searchstr"]', query);

        // 검색 버튼 클릭
        await page.click('#searchStrBtn');

        // 5초 동안 기다리기
        await page.waitForTimeout(5000);

        // 검색 결과 로딩 대기
        await page.waitForSelector('.title');

        const content = await page.content();
        const $ = cheerio.load(content);

        // 검색 결과 항목 추출
        $('.title').each((index, element) => {
            const titleText = $(element).find('h3').text().trim();
            const hrefElement = $(element).find('a').attr('href');

            const dateRange = $(element).siblings('.etc').text().trim();
            const status = $(element).siblings('.statNew').find('p.icon').text().trim();
            const daysLeft = $(element).siblings('.statNew').text().replace(status, '').trim();

            if (titleText !== "" && hrefElement) {
                const href = hrefElement.trim();
                results.push({
                    index: index + 1,
                    title: titleText,
                    link: `https://thinkyou.co.kr${href}`,
                    date: dateRange,
                    status: status,
                    daysLeft: daysLeft,
                  
                });  
            }
        });
    } catch (error) {
        console.error('Scraping failed:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    const sql = 'SELECT * FROM contests';
    db.get().query(sql, async function(err, rows) {
        if (err) {
            console.error('데이터 조회 오류:', err);
            res.status(500).send('서버 오류');
        } else {
            for (let item of results) {
                const title = item.title;

                // 데이터베이스에서 해당 title이 이미 존재하는지 확인합니다.
                const exists = rows.some(row => row.title === title);
                //console.log("중복체크성공?")
                if (!exists) {
                    const link = item.link;
                    const period = item.date;
                    const con_status = item.status;
                    const remaining_term = item.daysLeft;

                    const sql2 = 'INSERT INTO contests (title, link, period, con_status, remaining_term) VALUES (?, ?, ?, ?, ?)';    
                    db.get().query(sql2, [title, link, period, con_status, remaining_term], function(err, insertResult) {
                        if (err) {
                            console.error('데이터 삽입 오류:', err);
                            // 삽입 오류시 추가적인 처리가 필요하면 여기에 추가합니다.
                        } else {
                            // 삽입에 성공했을 때의 추가적인 처리가 필요하면 여기에 추가합니다.
                            console.log("삽입성공?")
                            console.log(title)
                        }
                    });
                }
            }
            
        
        }


    })

    return results;
}

/*
async function minjiscrape(query) {
    let browser;
    const results = [];
    try {
        browser = await puppeteer.launch({
            headless: true,
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        });

        const page = await browser.newPage();
        await page.goto('https://www.youtube.com/');

        // 검색어 입력
        await page.type('#search', query);

        // 검색 버튼 클릭 (YouTube의 검색 버튼 선택자)
        await page.click('#search-icon-legacy');

        // 검색 결과 로딩 대기
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        // 결과 추출
        const videos = await page.evaluate(() => {
            const videoElements = document.querySelectorAll('ytd-video-renderer, ytd-grid-video-renderer');
            const videoList = [];
            videoElements.forEach((el, index) => {
                const titleElement = el.querySelector('#video-title');
                const additionalInfoElement = el.querySelector('.style-scope ytd-video-primary-info-renderer');
                const title = titleElement ? titleElement.innerText : null;
                const link = titleElement ? titleElement.href : null;
                const additionalInfo = additionalInfoElement ? additionalInfoElement.innerText.split('\n') : [];

                if (title && link) {
                    videoList.push({
                        index: index + 1,
                        title: title,
                        link: link,
                        additionalInfo: additionalInfo
                    });
                }
            });
            return videoList;
        });

        results.push(...videos);
    } catch (error) {
        console.error('Scraping failed:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    console.log(results);
    return results;
}

minjiscrape("자바")

*/



const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';
const API_KEY = 'AIzaSyAa9i98npXTpi3pBV8nywuAQroei9WTzTA';
const searchYouTube = async (query, apiKey) => {
    try {
      const response = await axios.get(YOUTUBE_API_URL, {
        params: {
          part: 'snippet',
          maxResults: 10, // 필요한 결과 개수
          q: query,
          key: apiKey,
        }
      });
  
      // 결과에서 필요한 정보를 추출하고 URL을 추가
      const searchList = response.data.items.reduce((acc, item) => {
    
        let url = null;
        if (item.id.videoId) {
          url = `https://www.youtube.com/embed/${item.id.videoId}`;
        } else if (item.id.playlistId) {
          url = `https://www.youtube.com/embed/videoseries?list=${item.id.playlistId}`;
        }
  
        if (url && item.snippet.description) {
            acc.push({
              title: item.snippet.title,
              url: url,
              contents: item.snippet.description
            });
          }
  
        return acc;
      }, []);


      console.log(searchList)

      const sql = 'SELECT * FROM javayoutubedata';
          db.get().query(sql, async function(err, rows) {
                  if (err) {
                             console.error('데이터 조회 오류:', err);
                             
                  } else {
                                  for (let item of searchList) {
                                          const vod_title = item.title;
                                          const vod_contents = item.contents

                                            // 데이터베이스에서 해당 title이 이미 존재하는지 확인합니다.
                                             const exists = rows.some(row => row.vod_title === vod_title);
                                             console.log("중복체크중") 
                                             if (!exists) {
                                                 console.log("중복아님")
                                                 const vod_link = item.url;
                                                 const sql2 = 'INSERT INTO javayoutubedata (vod_title, vod_contents, vod_link) VALUES (?, ?, ?)';    
                                                    db.get().query(sql2, [vod_title, vod_contents, vod_link], function(err, insertResult) {
                                                       if (err) {
                                                                 console.error('데이터 삽입 오류:', err);
                                                   // 삽입 오류시 추가적인 처리가 필요하면 여기에 추가합니다.
                                                       } else {
                                                        // 삽입에 성공했을 때의 추가적인 처리가 필요하면 여기에 추가합니다.
                                                                 console.log("삽입성공?")
                                                             
                                                   }
                                               });

                                            }
            }
                                            
                                            }
                                           
        }
    )




      return searchList;
     
    } catch (error) {
      console.error('Error fetching YouTube search results:', error);
      return [];
    }
  };
  
 


const searchYouTubeJAVASCRIPT = async (query, apiKey) => {
    try {
        const response = await axios.get(YOUTUBE_API_URL, {
          params: {
            part: 'snippet',
            maxResults: 10, // 필요한 결과 개수
            q: query,
            key: apiKey,
          }
        });
    
        // 결과에서 필요한 정보를 추출하고 URL을 추가
        const searchList = response.data.items.reduce((acc, item) => {
      
          let url = null;
          if (item.id.videoId) {
            url = `https://www.youtube.com/embed/${item.id.videoId}`;
          } else if (item.id.playlistId) {
            url = `https://www.youtube.com/embed/videoseries?list=${item.id.playlistId}`;
          }
    
          if (url && item.snippet.description) {
              acc.push({
                title: item.snippet.title,
                url: url,
                contents: item.snippet.description
              });
            }
    
          return acc;
        }, []);
  
  
        console.log(searchList)
  
        const sql = 'SELECT * FROM javascriptyoutubedata';
            db.get().query(sql, async function(err, rows) {
                    if (err) {
                               console.error('데이터 조회 오류:', err);
                               
                    } else {
                                    for (let item of searchList) {
                                            const vod_title = item.title;
                                            const vod_contents = item.contents
  
                                              // 데이터베이스에서 해당 title이 이미 존재하는지 확인합니다.
                                               const exists = rows.some(row => row.vod_title === vod_title);
                                               console.log("중복체크중") 
                                               if (!exists) {
                                                   console.log("중복아님")
                                                   const vod_link = item.url;
                                                   const sql2 = 'INSERT INTO javascriptyoutubedata (vod_title, vod_contents, vod_link) VALUES (?, ?, ?)';    
                                                      db.get().query(sql2, [vod_title, vod_contents, vod_link], function(err, insertResult) {
                                                         if (err) {
                                                                   console.error('데이터 삽입 오류:', err);
                                                     // 삽입 오류시 추가적인 처리가 필요하면 여기에 추가합니다.
                                                         } else {
                                                          // 삽입에 성공했을 때의 추가적인 처리가 필요하면 여기에 추가합니다.
                                                                   console.log("삽입성공?")
                                                               
                                                     }
                                                 });
  
                                              }
              }
                                              
                                              }
                                             
          }
      )
  


      return searchList;
     
    } catch (error) {
      console.error('Error fetching YouTube search results:', error);
      return [];
    }
  };


  const searchYouTubephyton = async (query, apiKey) => {
    try {
        const response = await axios.get(YOUTUBE_API_URL, {
          params: {
            part: 'snippet',
            maxResults: 10, // 필요한 결과 개수
            q: query,
            key: apiKey,
          }
        });
    
        // 결과에서 필요한 정보를 추출하고 URL을 추가
        const searchList = response.data.items.reduce((acc, item) => {
      
          let url = null;
          if (item.id.videoId) {
            url = `https://www.youtube.com/embed/${item.id.videoId}`;
          } else if (item.id.playlistId) {
            url = `https://www.youtube.com/embed/videoseries?list=${item.id.playlistId}`;
          }
    
          if (url && item.snippet.description) {
              acc.push({
                title: item.snippet.title,
                url: url,
                contents: item.snippet.description
              });
            }
    
          return acc;
        }, []);
  
  
        console.log(searchList)
  
        const sql = 'SELECT * FROM phytonyoutubedata';
            db.get().query(sql, async function(err, rows) {
                    if (err) {
                               console.error('데이터 조회 오류:', err);
                               
                    } else {
                                    for (let item of searchList) {
                                            const vod_title = item.title;
                                            const vod_contents = item.contents
  
                                              // 데이터베이스에서 해당 title이 이미 존재하는지 확인합니다.
                                               const exists = rows.some(row => row.vod_title === vod_title);
                                               console.log("중복체크중") 
                                               if (!exists) {
                                                   console.log("중복아님")
                                                   const vod_link = item.url;
                                                   const sql2 = 'INSERT INTO phytonyoutubedata (vod_title, vod_contents, vod_link) VALUES (?, ?, ?)';    
                                                      db.get().query(sql2, [vod_title, vod_contents, vod_link], function(err, insertResult) {
                                                         if (err) {
                                                                   console.error('데이터 삽입 오류:', err);
                                                     // 삽입 오류시 추가적인 처리가 필요하면 여기에 추가합니다.
                                                         } else {
                                                          // 삽입에 성공했을 때의 추가적인 처리가 필요하면 여기에 추가합니다.
                                                                   console.log("삽입성공?")
                                                               
                                                     }
                                                 });
  
                                              }
              }
                                              
                                              }
                                             
          }
      )
  





      return searchList;
     
    } catch (error) {
      console.error('Error fetching YouTube search results:', error);
      return [];
    }
  };





  const searchYouTubereact = async (query, apiKey) => {
    try {
        const response = await axios.get(YOUTUBE_API_URL, {
          params: {
            part: 'snippet',
            maxResults: 10, // 필요한 결과 개수
            q: query,
            key: apiKey,
          }
        });
    
        // 결과에서 필요한 정보를 추출하고 URL을 추가
        const searchList = response.data.items.reduce((acc, item) => {
      
          let url = null;
          if (item.id.videoId) {
            url = `https://www.youtube.com/embed/${item.id.videoId}`;
          } else if (item.id.playlistId) {
            url = `https://www.youtube.com/embed/videoseries?list=${item.id.playlistId}`;
          }
    
          if (url && item.snippet.description) {
              acc.push({
                title: item.snippet.title,
                url: url,
                contents: item.snippet.description
              });
            }
    
          return acc;
        }, []);
  
  
        console.log(searchList)
  
        const sql = 'SELECT * FROM reactyoutubedata';
            db.get().query(sql, async function(err, rows) {
                    if (err) {
                               console.error('데이터 조회 오류:', err);
                               
                    } else {
                                    for (let item of searchList) {
                                            const vod_title = item.title;
                                            const vod_contents = item.contents
  
                                              // 데이터베이스에서 해당 title이 이미 존재하는지 확인합니다.
                                               const exists = rows.some(row => row.vod_title === vod_title);
                                               console.log("중복체크중") 
                                               if (!exists) {
                                                   console.log("중복아님")
                                                   const vod_link = item.url;
                                                   const sql2 = 'INSERT INTO reactyoutubedata (vod_title, vod_contents, vod_link) VALUES (?, ?, ?)';    
                                                      db.get().query(sql2, [vod_title, vod_contents, vod_link], function(err, insertResult) {
                                                         if (err) {
                                                                   console.error('데이터 삽입 오류:', err);
                                                     // 삽입 오류시 추가적인 처리가 필요하면 여기에 추가합니다.
                                                         } else {
                                                          // 삽입에 성공했을 때의 추가적인 처리가 필요하면 여기에 추가합니다.
                                                                   console.log("삽입성공?")
                                                               
                                                     }
                                                 });
  
                                              }
              }
                                              
                                              }
                                             
          }
      )
  





      return searchList;
     
    } catch (error) {
      console.error('Error fetching YouTube search results:', error);
      return [];
    }
  };









function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}
async function crawleringchecker() {
    try {
        // 5초간 기다립니다
        await delay(5000);

        const sql = 'SELECT * FROM competionDaychecker ORDER BY updateid DESC';
        db.get().query(sql, function(err, rows) {
            if (err) {
                console.error(err);
                return;
            }
            if (rows.length > 0) {
                const updateday = rows[0].updateday;
              //  console.log(updateday);

                function getFormattedDate() {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = today.getMonth() + 1; // getMonth()는 0부터 시작합니다.
                    const day = today.getDate();
                
                    // 월과 일을 항상 두 자리 숫자로 표시합니다.
                    const formattedMonth = month < 10 ? `0${month}` : month;
                    const formattedDay = day < 10 ? `0${day}` : day;
                
                    return `${year}-${formattedMonth}-${formattedDay}`;
                }
                
                const currentDate = getFormattedDate();
             //   console.log(currentDate);
                if (updateday !== currentDate ){
                   // console.log("틀리다니깐?");
                    scrape("해커톤");
                    const updatedaysql = currentDate;
                    const sql2 = 'INSERT INTO competionDaychecker(updateday) values (?)';
                    db.get().query(sql2,[updatedaysql], function(err, rows) {
                        if(err){
                            console.log("업데이트실패");
                        }else{
                            console.log("업데이트성공");
                            console.log(updatedaysql);
                        }

                    });
                }else{
                    console.log("크롤링완료");
                    console.log(updateday);

                }

            } else {
                console.log("No data found");
            }

        });
    } catch (err) {
        console.error('Error occurred:', err);
    }
}

crawleringchecker();
searchYouTube('자바', API_KEY)
 
.catch(error => console.error(error));

searchYouTubeJAVASCRIPT('자바스크립트', API_KEY)
 
.catch(error => console.error(error));

searchYouTubephyton('파이썬', API_KEY)
 
.catch(error => console.error(error));

searchYouTubereact('리액트', API_KEY)
 
.catch(error => console.error(error));




router.get('/list.json', async(req, res) => {
  
    const sql = 'SELECT * FROM contests';

    db.get().query(sql, async function(err, rows) {
      
            res.send({ list: rows });
        })
    
});


router.get('/javalist.json', async(req, res) => {
  
    const sql = 'SELECT * FROM javayoutubedata';

    db.get().query(sql, async function(err, rows) {
      
            res.send({ list: rows });
        })
    
});



router.get('/javascriptlist.json', async(req, res) => {
  
    const sql = 'SELECT * FROM javascriptyoutubedata';

    db.get().query(sql, async function(err, rows) {
      
            res.send({ list: rows });
        })
    
});




router.get('/phytonyoutubedatalist.json', async(req, res) => {
  
    const sql = 'SELECT * FROM phytonyoutubedata';

    db.get().query(sql, async function(err, rows) {
      
            res.send({ list: rows });
        })
    
});



router.get('/reactyoutubedatalist.json', async(req, res) => {
  
    const sql = 'SELECT * FROM reactyoutubedata';

    db.get().query(sql, async function(err, rows) {
      
            res.send({ list: rows });
        })
    
});



/*


const OPENAI_API_KEY="--"
async function callChatGPT(prompt) {

  const configuration = new Configuration({
    apiKey: OPENAI_API_KEY,
  });

  try {
    const openai = new OpenAIApi(configuration);


    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{role: "user", content: "Hello world"}],
    });
    console.log(response.data.choices[0].message)
    return response.data.choices[0].message;

  } catch (error) {
    console.error('Error calling ChatGPT API:', error);
    return null;
  }
}
callChatGPT("ak47에 대해서알려줘")




*/



function search(keywords) {
    // 결과 영역 초기화

 
    const messages = [
      { role: 'system', content: 'You are a helpful career counselor.' },
      { role: 'user', content: '나는 이'+ keywords +'프로그래밍 언어를 잘해 이 프로그래밍 언어에 맞는 직업과 직군을 추천해줘' },//+ '에 대하여 다루어 볼 만한 한국어 책을 제목만 5가지 추천해줘.'
    ]
    const config = {
      headers: {
        Authorization: `Bearer --`,
        'Content-Type': 'application/json',
      },
    }
    const data = {
      model: 'gpt-3.5-turbo',
      temperature: 0.5,
      n: 1,
      messages: messages,
    }
    axios
      .post('https://api.openai.com/v1/chat/completions', data, config)
      .then(function (response) {

        console.log(response.data.choices)
        console.log("잘됨")
        })
      
      .catch(function (error) {
        console.log("에러")
        console.error(error)
      })
  }

  //search("파이썬");


/*

  const OPENAI_API_KEY = "---";
  
  async function callChatGPT(prompt) {
    const configuration = {
      apiKey: OPENAI_API_KEY,
    };
  
    const openai = new OpenAIApi(configuration);
  
    try {
      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      });
      console.log(response.data.choices[0].message);
      return response.data.choices[0].message;
  
    } catch (error) {
      console.error('Error calling ChatGPT API:', error);
      return null;
    }
  }
  
  callChatGPT("ak47에 대해서 알려줘");
  



*/

router.get('/javalist/:vod_id', async(req, res) => { 
    const vod_id=req.params.vod_id;
    const sql = 'select * from javayoutubedata where vod_id=?';
    db.get().query(sql,[vod_id], async function(err, rows) {
        if (err) {
            console.log(err);
            res.status(500).send('Server Error');
            return;
          }
          res.send({rows });
        });      
});



module.exports = router;