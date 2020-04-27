const puppeteer = require("puppeteer");
const fs = require("fs");

const resultsSelector = ".result .translation span";
const typeSelector = "#source";

// set value without type
const setValueInput = (page, selector, value) => {
  return page.evaluate(
    ({ selector, value }) => {
      document.querySelector(selector).value = value;
      return value;
    },
    { selector, value }
  );
};

const waitElementNotEmpty = (page, selector) => {
  return page.waitFor(
    ({ selector }) =>
      !!document.querySelector(selector) &&
      document.querySelector(selector).value !== "",
    {},
    { selector }
  );
};

const getValue = (page, selector) => {
  return page.evaluate((selector) => {
    const val = document.querySelector(selector).textContent;
    document.querySelector(selector).value = "";
    return val;
  }, selector);
};

const checkTranslation = async (page, keyObj) => {
  await setValueInput(page, typeSelector, keyObj.value);
  await waitElementNotEmpty(page, resultsSelector);
  keyObj.value = await getValue(page, resultsSelector);
  await setValueInput(page, typeSelector, "");
};

const iterateKeys = async (page, keys) => {
  const translationsPromises = [];
  keys.forEach((category) => {
    if (category.resources) {
      category.resources.reduce((previousPromise, keyObj) => {
        if (keyObj.value) {
          const promise = previousPromise.then(() =>
            checkTranslation(page, keyObj)
          );
          translationsPromises.push(promise);
          return promise;
        } else {
          return Promise.resolve();
        }
      }, Promise.resolve());
    }
  });

  return Promise.all(translationsPromises);
};

async function run() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  let rawdata = fs.readFileSync("./data/desktop_test.json");
  let keys = JSON.parse(rawdata);

  await page.goto(
    "https://translate.google.com/#view=home&op=translate&sl=en&tl=ar"
  );
  await page.waitFor(3000);

  await iterateKeys(page, keys);

  browser.close();
}

run();
