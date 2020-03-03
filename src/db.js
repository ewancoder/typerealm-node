module.exports = {
  locations: [
    {
      locationId: 1,
      name: 'Village',
      description: 'Village description',
      locations: [ 3 ]
    },
    {
      locationId: 2,
      name: 'Forest',
      description: 'Forest near village'
    },
    {
      locationId: 3,
      name: 'House',
      description: 'House in the village',
      locations: [ 1 ]
    },
    {
      locationId: 4,
      name: 'Secret place',
      description: 'Secret place with treasures.. and it leads to the forest with a one-way road'
    },
    {
      locationId: 5,
      name: 'River',
      description: 'Small brook'
    }
  ],
  roads: [
    {
      roadId: 1,
      name: 'Road from village to forest',
      description: 'Curvy road',
      fromLocationId: 1,
      toLocationId: 2,
      distance: 100,
      backwardRoadId: 2
    },
    {
      roadId: 2,
      name: 'Road from forest to village',
      description: 'Straight road',
      fromLocationId: 2,
      toLocationId: 1,
      distance: 50,
      backwardRoadId: 1
    },
    {
      roadId: 3,
      name: 'Secret pathway',
      description: 'Secret pathway to unknown place',
      fromLocationId: 3,
      toLocationId: 4,
      distance: 200
    },
    {
      roadId: 4,
      name: 'The climb',
      description: 'Climb down from the wall to the river',
      fromLocationId: 4,
      toLocationId: 5,
      distance: 30
    },
    {
      roadId: 5,
      name: 'Fun road',
      description: 'Fun and healing road',
      fromLocationId: 5,
      toLocationId: 2,
      distance: 20,
      backwardRoadId: 6
    },
    {
      roadId: 6,
      name: 'Fun road',
      description: 'Fun and healing road',
      fromLocationId: 2,
      toLocationId: 5,
      distance: 20,
      backwardRoadId: 5
    },
    {
      roadId: 7,
      name: 'Road to village',
      description: 'Leads to village uphill',
      fromLocationId: 5,
      toLocationId: 1,
      distance: 200,
      backwardRoadId: 8
    },
    {
      roadId: 8,
      name: 'Road to river',
      description: 'Leads to river downhill',
      fromLocationId: 1,
      toLocationId: 5,
      distance: 100,
      backwardRoadId: 7
    }
  ]
};
