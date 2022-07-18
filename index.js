const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');
const _ = require('lodash');
let fs = require('fs');

const getDate = async (urlItem) => {
  const url = urlItem;
  const res = await cloudscraper(url, { method: 'GET' });
  const $ = cheerio.load(res);

  // ----- function to get variables from the DOM

  const findTextAndReturnRemainder = (target, variable) => {
    const chopFront = target.substring(
      target.search(variable) + variable.length,
      target.length
    );

    const result = chopFront.substring(0, chopFront.search(';'));

    return result;
  };

  // ----- get var anime_info for date

  const text = await $($('script')).text();
  const findAndClean = await findTextAndReturnRemainder(
    text,
    'var anime_info ='
  );
  const result = await JSON.parse(findAndClean);

  // ----- get image

  const image = await $('div.Image > figure > img').attr('src');

  return {
    date: result[result.length - 1],
    image: 'https://www3.animeflv.net' + image,
  };
};

const getList = async () => {
  const url = 'https://www3.animeflv.net';
  const res = await cloudscraper(url, { method: 'GET' });
  const $ = cheerio.load(res);

  const list = [];

  $('ul.ListSdbr')
    .find('li > a')
    .each((index, element) => {
      // ----- get anime name

      const name = $(element)
        .contents()
        .filter(function () {
          return this.type === 'text';
        })
        .text();

      // ----- get anime url

      const itemUrl = url + $(element).attr('href');

      list.push({
        name: name.slice(0, -1),
        url: itemUrl,
      });
    });

  return list;
};

(async () => {
  console.log(
    '\n---------------------------------------- initialized ----------------------------------------\n'
  );

  // ----- get list of anime on broadcast
  const list = await getList();

  if (list) console.log('-list obtained\n');

  // ----- list cut by chunk
  const chunkList = _.chunk(list, 10);

  // ----- resolve list
  for await (const row of chunkList) {
    await Promise.all(
      row.map(async (item) => {
        console.log('getting date of -', item.name);

        const indexItem = list.findIndex((x) => x.name == item.name);

        const itemDate = await getDate(item.url);

        list[indexItem].date = itemDate.date;
        list[indexItem].image = itemDate.image;
      })
    );
  }

  // save data in data.json

  const writer = fs.createWriteStream('data.json');

  writer.write(JSON.stringify(list));

  console.log('\n-saved data');

  console.log(
    '\n---------------------------------------- finalized ----------------------------------------'
  );
})();
