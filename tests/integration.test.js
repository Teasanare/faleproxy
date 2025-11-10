const axios = require('axios');
const cheerio = require('cheerio');
const request = require('supertest');
const { sampleHtmlWithYale } = require('./test-utils');
const nock = require('nock');

const app = require('../app');

describe('Integration Tests', () => {
  beforeAll(async () => {
    // Mock external HTTP requests
    nock.disableNetConnect();
    nock.enableNetConnect();
  }, 10000); // Increase timeout for server startup

  afterAll(async () => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  test('Should replace Yale with Fale in fetched content', async () => {
    // Setup mock for example.com
    nock('https://example.com')
      .get('/')
      .reply(200, sampleHtmlWithYale);
    
    // Make a request to our proxy app
    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://example.com/' })
      .set('Content-Type', 'application/json');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    // Verify Yale has been replaced with Fale in text
    const $ = cheerio.load(response.body.content);
    expect($('title').text()).toBe('Fale University Test Page');
    expect($('h1').text()).toBe('Welcome to Fale University');
    expect($('p').first().text()).toContain('Fale University is a private');
    
    // Verify URLs remain unchanged
    const links = $('a');
    let hasYaleUrl = false;
    links.each((i, link) => {
      const href = $(link).attr('href');
      if (href && href.includes('yale.edu')) {
        hasYaleUrl = true;
      }
    });
    expect(hasYaleUrl).toBe(true);
    
    // Verify link text is changed
    expect($('a').first().text()).toBe('About Fale');
  }, 10000); // Increase timeout for this test

  test('Should handle invalid URLs', async () => {
    const errorResponse = await request(app)
      .post('/fetch')
      .send({ url: 'not-a-valid-url' })
      .set('Content-Type', 'application/json');
    expect(errorResponse.status).toBe(500);
  });

  test('Should handle missing URL parameter', async () => {
    const missingResponse = await request(app)
      .post('/fetch')
      .send({})
      .set('Content-Type', 'application/json');
    expect(missingResponse.status).toBe(400);
    expect(missingResponse.body.error).toBe('URL is required');
  });
});
