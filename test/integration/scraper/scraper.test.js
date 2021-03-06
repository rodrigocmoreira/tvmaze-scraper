const { assert } = require('chai');
const Datastore = require('nedb');
const nock = require('nock');
const server = require('../../../lib/application');
const { config } = require('../../../lib/commons');
const { dbService } = require('../../../lib/repository');
const { core } = require('../../../lib/scraper');

const TVMAZE_SHOWS_URL = 'http://shows.com/shows';
const TVMAZE_CAST_URL = 'http://cast.com/shows/:id/cast';

config.set('TVMAZE_SHOWS_URL', TVMAZE_SHOWS_URL);
config.set('TVMAZE_CAST_URL', TVMAZE_CAST_URL);
config.set('PAGE_SIZE', 1);

describe('#Integration scraper loader  test scraper', () => {
  let db;
  before(async () => {
    db = await dbService.getDBInstance(new Datastore());
    await server.start();
  });

  beforeEach(() => {
    nock.cleanAll();
  });

  after(async () => {
    nock.cleanAll();
    await server.close();
  });

  it('Should fill database with loaded shows with cast', async () => {
    const showsBodyResultPage0 = [
      {
        id: 1,
        name: 'Game of Thrones',
        channel: 'hbo'
      }
    ];

    const showsBodyResultPage1 = [
      {
        id: 2,
        name: 'Big Bang Theory',
        channel: 'warner'
      }
    ];

    const showsBodyResultPage2 = [];

    const castResult1 = [
      {
        id: 1,
        name: 'Game of Thrones',
        person: [
          {
            id: 9,
            name: 'Dean Norris',
            birthday: '1963-04-08'
          },
          {
            id: 7,
            name: 'Mike Vogel',
            birthday: '1979-07-17'
          }
        ]
      }
    ];

    const castResult2 = [
      {
        id: 2,
        name: 'Big Bang Theory',
        person: [
          {
            id: 6,
            name: 'Michael Emerson',
            birthday: '1950-01-01'
          }
        ]
      }
    ];

    const nockShows = nock('http://shows.com/shows');

    const showsNockGetPage0 = () => nockShows
      .get('?page=0')
      .reply(200, () => showsBodyResultPage0);

    const showsNockGetPage1 = () => nockShows
      .get('?page=1')
      .reply(200, () => showsBodyResultPage1);

    const showsNockGetPage2 = () => nockShows
      .get('?page=2')
      .reply(200, () => showsBodyResultPage2);

    const nockCast = nock('http://cast.com/shows');

    const showsNockGetCastId1 = () => nockCast
      .get('/1/cast')
      .reply(200, () => castResult1);

    const showsNockGetCastId2 = () => nockCast
      .get('/2/cast')
      .reply(200, () => castResult2);

    showsNockGetPage0();
    showsNockGetPage1();
    showsNockGetPage2();
    showsNockGetCastId1();
    showsNockGetCastId2();

    const expectedResult = [
      {
        id: 1,
        name: 'Game of Thrones',
        cast: [
          {
            id: 9,
            name: 'Dean Norris',
            birthday: new Date('1963-04-08')
          },
          {
            id: 7,
            name: 'Mike Vogel',
            birthday: new Date('1979-07-17')
          }
        ]
      },
      {
        id: 2,
        name: 'Big Bang Theory',
        cast: [
          {
            id: 6,
            name: 'Michael Emerson',
            birthday: new Date('1950-01-01')
          }
        ]
      }
    ];

    await core.scraperExecution();
    const shows = await db.find({}, { _id: 0 }, { id: 1 });
    assert.deepEqual(shows, expectedResult);
  });

  it('Should return error on get shows', async () => {
    const internalError = 500;
    const showsNockGetPage0 = () => {
      const urlShows = `${config.get('TVMAZE_SHOWS_URL')}`;
      return nock(urlShows)
        .get('?page=0', () => true)
        .replyWithError(internalError, {});
    };

    showsNockGetPage0();

    try {
      await core.scraperExecution();
    } catch (error) {
      assert.equal(error.message, internalError);
    }
  });
});
