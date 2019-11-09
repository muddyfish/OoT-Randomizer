import React, {Component} from 'react'
import update from 'immutability-helper';
import './App.css';

class App extends Component {
  async componentDidMount() {
    const dists = await (await fetch("./dists.json")).json();
    const locations = await (await fetch("./locations.json")).json();
    this.setState({
      dists,
      regionDists: this.calcRegionDists(locations, dists),
      regionProbs: this.calcRegionProbs(locations, dists),
      locations,
      search: "",
      showKeys: false,
      showNone: false,
      regionSort: false
    });
  }

  calcRegionDists(locations, dists) {
    const items = {};
    Object.entries(dists).forEach(([loc, dists]) => {
      const region = locations[loc].scene;
      Object.entries(dists).forEach(([item, prob]) => {
        items[item] = items[item] || {};
        items[item][region] = items[item][region] || 0;
        items[item][region] += prob;
      })
    });
    return items;
  }

  calcRegionProbs(locations, dists) {
    const scenes = {};
    Object.entries(dists).forEach(([loc, dists]) => {
      const region = locations[loc].scene;
      const total = Object.values(dists).reduce((a, b) => a + b);
      Object.entries(dists).forEach(([item, prob]) => {
        scenes[region] = scenes[region] || {};
        scenes[region][item] = scenes[region][item] || 0;
        scenes[region][item] += prob / total;
        if (scenes[region][item] > 1) {
          scenes[region][item] = 1;
        }
      });
    });
    console.log(scenes);
    return scenes;
  }

  render() {
    if (this.state === null) {
      return null;
    }
    const rows = Object.entries(this.state.locations).map(([location, {region, scene}]) => {
      if (this.state.dists[location] === undefined) {
        return [[0, 0], null];
      }
      if (location.includes("Subrule")) {
        return [[0, 0], null];
      }
      const items = this.state.dists[location];
      const filteredItems = Object.entries(items).filter(([name, v]) => name.toLowerCase().includes(this.state.search) && (this.state.showKeys || !name.toLowerCase().includes("key")) && (this.state.showNone || !name.toLowerCase().includes("none")));
      if (filteredItems.length === 0) {
        return [[0, 0], null];
      }
      const biggest = filteredItems.reduce((a, b) => a[1] > b[1] ? a : b)[0];
      const total = Object.values(items).reduce((a, b) => a + b);
      if (total === items[biggest]) {
        return [[0, 0], null];
      }

      return [
        [this.state.regionDists[biggest][scene], items[biggest] / total],
        <tr key={location}>
          <td>{scene}</td>
          <td>{region}</td>
          <td>{location}</td>
          <td>{biggest}</td>
          <td>{parseFloat((100 * items[biggest] / total).toPrecision(2))}%</td>
          <td>{parseFloat((100 * this.state.regionProbs[scene][biggest]).toPrecision(2))}%</td>
        </tr>
      ];
    });
    return (
      <div>
        <input value={this.state.search} onChange={(event) => {
          this.setState(update(this.state,
            {$merge: {
                search: event.target.value.toLowerCase(),
              }}));
        }}/>
        <input type="checkbox" checked={this.state.showKeys} onChange={(event) => {
          this.setState(update(this.state,
            {$merge: {
                showKeys: event.target.checked
              }}));
        }}/> Show Keys
        <input type="checkbox" checked={this.state.showNone} onChange={(event) => {
          this.setState(update(this.state,
            {$merge: {
                showNone: event.target.checked
              }}));
        }}/> Show Crap
        <input type="checkbox" checked={this.state.regionSort} onChange={(event) => {
          this.setState(update(this.state,
            {$merge: {
                regionSort: event.target.checked
              }}));
        }}/> Sort by region probability
        <table border="-" style={{borderSpacing: "0px", borderCollapse: "collapse"}}>
          <thead>
            <tr>
              <th>Region</th>
              <th>Room</th>
              <th>Location</th>
              <th>Item</th>
              <th>Probability</th>
              <th>Region Probability</th>
            </tr>
          </thead>
          <tbody>
            {rows.sort(([[rp1, c1], r1], [[rp2, c2], r2]) => {
              if (this.state.regionSort && rp1 !== rp2) {
                return (rp1 < rp2) - (rp1 > rp2);
              }
              return (c1 < c2) - (c1 > c2);
            }).map(([c, r]) => r)}
          </tbody>
        </table>
      </div>
    );
  }
}

export default App;
