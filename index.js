require("dotenv").config();
const { IgApiClient } = require('instagram-private-api');
const { get } = require('request-promise');
const { XMLParser } = require('fast-xml-parser');
const blackList = require('./blackList');
const { readFileSync } = require('fs');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const postToInsta = async () => {
    const ig = new IgApiClient();
    ig.state.generateDevice(process.env.IG_USERNAME);
    await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);

    console.log("Connect instagram was successfully.")
    
    const xmlFile = readFileSync(`${process.cwd()}/clothes.xml`, 'utf8');
    const parser = new XMLParser();
    const json = parser.parse(xmlFile);
    console.log("Read was successfully.")

    const offerContainer = json.yml_catalog.shop.offers.offer
    for (let i = 54; i < offerContainer.length; i++) {
        console.log("Post created ...", i)
        if(!blackList.filter((e) => e === i).length){
            const arrImageBuffer = []

            for(let j = 0; j < offerContainer[i].picture.length; j++){
                const resultImageBuffer = await get({
                    url: offerContainer[i].picture[j],
                    encoding: null, 
                })
                arrImageBuffer.push({file: resultImageBuffer})
            }
            
            const stripCDATA = offerContainer[i].description.slice(9, offerContainer[i].description.length - 3)
            const stripN = stripCDATA.replace("\n", " ");
            const stripHtml = stripN.replace(/(<([^>]+)>)/gi, "\n");
            const stripSmile = stripHtml.replace("&#13;", " ");
            const resultDescription = stripSmile.replace(/&#13;(?![.,])|(?<=[^.,])&#13;/g, '');

            let availableSize = ""
            for (let sizeVal = 0; sizeVal < offerContainer[i].avail.size.length; sizeVal++) {
                availableSize += `/ ${offerContainer[i].avail.size[sizeVal]} `;
            }

            await ig.publish.album({
                items: arrImageBuffer,
                caption: `${offerContainer[i].model}\n\n
                          ${resultDescription.trim()}
                          \n\nЦена: ${offerContainer[i].oldprice ? offerContainer[i].oldprice + 200 : offerContainer[i].price + 200} грн
                          \n\nДоступные размеры: ${availableSize}
                          \n\n${offerContainer[i].param[0]}`,
            });

            process.env.BOOL_DELAY === "true" && 
                await delay(60000 * process.env.DELAY_MIN) 
        }
    }
    console.log("All posts was successfully upload")
}

postToInsta()