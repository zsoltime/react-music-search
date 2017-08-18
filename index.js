class SearchForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      query: '',
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }
  handleChange(e) {
    this.setState({
      query: e.target.value,
    });
  }
  handleSubmit(e) {
    e.preventDefault();
    this.props.onSubmit(this.state.query);
  }
  render() {
    return (
      <form
        className="search-form"
        onSubmit={this.handleSubmit}
      >
        <input
          className="search-form__field"
          type="search"
          defaultValue={this.state.query}
          ref={node => { this.searchInput = node; }}
          onChange={this.handleChange}
          placeholder="Type an artist name"
        />
        <button className="search-form__btn">Search</button>
      </form>
    );
  }
}

SearchForm.propTypes = {
  onSubmit: React.PropTypes.func.isRequired,
};

const ArtistProfile = ({ artist }) => {
  if (!artist) { return <div className="artist" />; }

  const { external_urls, followers, genres, href, images, name } = artist;
  // @todo: check if there is an image, add default image
  const imageUrl = images.length > 0 ? images[0].url : '';
  const style = { backgroundImage: `url(${imageUrl})` };
  const genreList = genres.map((genre, i) => (
    <li key={i} className="artist__genre">#{genre}</li>
  ));

  return (
    <div className="artist">
      <div className="artist__background" style={style} />
      <div className="artist__image">
        <img src={imageUrl} />
      </div>
      <h3 className="artist__name">{name}</h3>
      <div className="artist__followers">
        Followers: {followers.total.toLocaleString()}
      </div>
      <ul className="artist__genres">
        {genreList}
      </ul>
    </div>
  );
}

ArtistProfile.defaultProps = {
  artist: undefined,
};

ArtistProfile.propTypes = {
  artist: React.PropTypes.object,
};

class Tracklist extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentSong: undefined,
      isPlaying: false,
    };
    this.audio = undefined;
    this.audioId = undefined;
    this.playAudio = this.playAudio.bind(this);
  }
  playAudio(url) {
    const audio = new Audio(url);

    if (this.state.isPlaying) {
      this.audio.pause();
      if (this.state.currentSong === url) {
        this.setState({
          isPlaying: false,
        });
      } else {
        this.audio = audio;
        this.audio.addEventListener('ended', () => {
          this.audio.currentTime = 0;
          console.log('ended');
          this.setState({
            isPlaying: false,
          });
        });
        audio.play();
        this.setState({
          isPlaying: true,
          currentSong: url,
        });
      }
    } else {
      this.audio = audio;
      this.audio.addEventListener('ended', () => {
        this.audio.currentTime = 0;
        console.log('ended');
        this.setState({
          isPlaying: false,
        });
      });
      audio.play();
      this.setState({
        isPlaying: true,
        currentSong: url,
      });
    }
  }
  render() {
    const { tracks } = this.props;
    if (!tracks) { return (<div></div>); }

    const tracklist = tracks.map(({ id, name, album, preview_url }) => (
      <div
        key={id}
        className="track"
        onClick={() => this.playAudio(preview_url)}
      >
        <img className="track__image" src={album.images[0].url} alt="" />
        <div className="track__controls">
          {this.state.currentSong === preview_url && this.state.isPlaying ?
            <span className="track__control track__control--pause">&#10073; &#10073;</span> :
            <span className="track__control track__control--play">&#9654;</span>
          }
        </div>
        <div className="track__name">{name}</div>
      </div>
    ));

    return (
      <div className="tracklist">
        {tracklist}
      </div>
    );
  }
};

Tracklist.defaultProps = {
  tracks: [],
};

Tracklist.propTypes = {
  tracks: React.PropTypes.array,
};

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      artist: undefined,
      searchQuery: '',
      tracks: [],
    };

    this.handleSearch = this.handleSearch.bind(this);
  }
  componentDidMount() {
    this.spotify = Spotify();

    fetch('https://zsolti.co/spotify/')
      .then(res => res.json())
      .then(res => {
        this.spotify.setAccessToken(res.token);
      });
      // handle error !
  }
  handleSearch(query) {
    this.spotify.searchArtists(query, { limit: 1 })
      .then(res => {
        console.log(res);
        return res;
      })
      .then(res => {
        const artist = res.artists.items[0];

        this.setState({ artist });
        return artist.id;
      })
      .then(id => this.spotify.getArtistTopTracks(id, 'GB'))
      // .then(id => this.spotify.getArtistAlbums(id))
      // @todo: check if there are tracks, dispaly message if there isn't any
      .then(res => {console.log(res); return res; })
      .then(res => {
        const { tracks } = res;
        this.setState({ tracks });
      });
  }
  componentDidUpdate() {
    document.querySelector('.artist').scrollIntoView({ behavior: 'smooth' });
  }
  render() {
    return (
      <div className="app">
        <h1 className="app__title">React MusicSearch</h1>
        <SearchForm onSubmit={this.handleSearch} />
        <ArtistProfile artist={this.state.artist} />
        <Tracklist tracks={this.state.tracks} />
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById('app'));

function Spotify(token) {
  const baseUrl = 'https://api.spotify.com/v1';
  let accessToken = token || null;

  function appendParams(url, params) {
    if (!params) {
      return url;
    }
    const query = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    return `${url}?${query}`;
  }

  function request(data) {
    const url = appendParams(data.url, data.params);
    const req = new Request(url, {
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`, // check if there's a token?
      }),
    });

    return new Promise((resolve, reject) => {
      fetch(req)
        .then(res => resolve(res.json()))
        .catch(err => reject(err));
    });
  }

  const api = {};

  api.getAccessToken = function() {
    return accessToken;
  };

  api.setAccessToken = function(token) {
    accessToken = token;
  };

  // used for returned 'next' URLs only
  api.getNext = function(url) {
    return (url.indexOf(baseUrl) !== 0) ? null : request(url);
  };

  api.search = function(q, types, options = {}) {
    const params = Object.assign({
      q,
      type: types.join(','),
    }, options);

    return request({
      url: `${baseUrl}/search/`,
      params,
    });
  };

  api.searchArtists = function(q, options) {
    return this.search(q, ['artist'], options);
  };

  api.searchArtist = function(q) {
    const artists = this.searchArtists(q, { limit: 1 });

    return (artists.items.length > 0) ? artists[0] : null;
  };

  api.getArtistTopTracks = function(id, country) {
    const data = {
      url: `${baseUrl}/artists/${id}/top-tracks`,
      params: { country },
    };

    return request(data);
  }

  return api;
}

/*
 * smoothscroll polyfill - v0.3.5
 * https://iamdustan.github.io/smoothscroll
 * 2016 (c) Dustan Kasten, Jeremias Menichelli - MIT License
 */
!function(a,b,c){function d(){function h(a,b){this.scrollLeft=a,this.scrollTop=b}function i(a){return.5*(1-Math.cos(Math.PI*a))}function j(a){if("object"!=typeof a||null===a||a.behavior===c||"auto"===a.behavior||"instant"===a.behavior)return!0;if("object"==typeof a&&"smooth"===a.behavior)return!1;throw new TypeError("behavior not valid")}function k(c){var d,e,f;do{c=c.parentNode,d=c===b.body,e=c.clientHeight<c.scrollHeight||c.clientWidth<c.scrollWidth,f="visible"===a.getComputedStyle(c,null).overflow}while(!d&&(!e||f));return d=e=f=null,c}function l(b){var d,f,h,c=g(),j=(c-b.startTime)/e;j=j>1?1:j,d=i(j),f=b.startX+(b.x-b.startX)*d,h=b.startY+(b.y-b.startY)*d,b.method.call(b.scrollable,f,h),f===b.x&&h===b.y||a.requestAnimationFrame(l.bind(a,b))}function m(c,d,e){var i,j,k,m,n=g();c===b.body?(i=a,j=a.scrollX||a.pageXOffset,k=a.scrollY||a.pageYOffset,m=f.scroll):(i=c,j=c.scrollLeft,k=c.scrollTop,m=h),l({scrollable:i,method:m,startTime:n,startX:j,startY:k,x:d,y:e})}if(!("scrollBehavior"in b.documentElement.style)){var d=a.HTMLElement||a.Element,e=468,f={scroll:a.scroll||a.scrollTo,scrollBy:a.scrollBy,elScroll:d.prototype.scroll||h,scrollIntoView:d.prototype.scrollIntoView},g=a.performance&&a.performance.now?a.performance.now.bind(a.performance):Date.now;a.scroll=a.scrollTo=function(){if(j(arguments[0]))return void f.scroll.call(a,arguments[0].left||arguments[0],arguments[0].top||arguments[1]);m.call(a,b.body,~~arguments[0].left,~~arguments[0].top)},a.scrollBy=function(){if(j(arguments[0]))return void f.scrollBy.call(a,arguments[0].left||arguments[0],arguments[0].top||arguments[1]);m.call(a,b.body,~~arguments[0].left+(a.scrollX||a.pageXOffset),~~arguments[0].top+(a.scrollY||a.pageYOffset))},d.prototype.scroll=d.prototype.scrollTo=function(){if(j(arguments[0]))return void f.elScroll.call(this,arguments[0].left||arguments[0],arguments[0].top||arguments[1]);m.call(this,this,arguments[0].left,arguments[0].top)},d.prototype.scrollBy=function(){var a=arguments[0];"object"==typeof a?this.scroll({left:a.left+this.scrollLeft,top:a.top+this.scrollTop,behavior:a.behavior}):this.scroll(this.scrollLeft+a,this.scrollTop+arguments[1])},d.prototype.scrollIntoView=function(){if(j(arguments[0]))return void f.scrollIntoView.call(this,arguments[0]||!0);var c=k(this),d=c.getBoundingClientRect(),e=this.getBoundingClientRect();c!==b.body?(m.call(this,c,c.scrollLeft+e.left-d.left,c.scrollTop+e.top-d.top),a.scrollBy({left:d.left,top:d.top,behavior:"smooth"})):a.scrollBy({left:e.left,top:e.top,behavior:"smooth"})}}}"object"==typeof exports?module.exports={polyfill:d}:d()}(window,document);
