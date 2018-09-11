const tableName = process.env.ORTHRUS_EVENT_STORE_TABLE || 'orthrus-events'
exports.seed = function(knex, Promise) {
  // Deletes ALL existing entries
  return knex(tableName)
    .del()
    .then(() => {
      // Inserts seed entries
      return knex(tableName).insert([
        {
          aggregateId: '49b1ddf5-f234-4e31-9342-75713e6b43c2',
          aggregate: 'product',
          commitId: '2777b538-65b0-4245-883a-8ac333cae229',
          revision: 1,
          payload: '{}',
        },
        {
          aggregateId: 'cd452c3b-7d6f-49f5-b9cb-1a906d21f7e3',
          aggregate: 'product',
          commitId: 'b2000e9f-ae72-4d60-b5b9-44de987fe82c',
          revision: 1,
          payload: '{}',
        },
        {
          aggregateId: '49b1ddf5-f234-4e31-9342-75713e6b43c2',
          aggregate: 'product',
          commitId: 'a12602de-5857-4ef6-81da-d69d4c5d52ec',
          revision: 2,
          payload: '{}',
        },
        {
          aggregateId: '0080fedc-f59d-4480-a1bc-73daf4709307',
          aggregate: 'user',
          commitId: 'ce78315f-30e9-4796-a1b3-1df4451c479b',
          revision: 1,
          payload: '{}',
        },
        {
          aggregateId: '49b1ddf5-f234-4e31-9342-75713e6b43c2',
          aggregate: 'product',
          commitId: '2450014f-3acd-4290-9e2e-1dc0a4373a84',
          revision: 3,
          payload: '{}',
        },
        {
          aggregateId: '49b1ddf5-f234-4e31-9342-75713e6b43c2',
          aggregate: 'product',
          commitId: '2450014f-3acd-4290-9e2e-1dc0a4373a84',
          revision: 4,
          payload: '{}',
        },
        {
          aggregateId: 'cd452c3b-7d6f-49f5-b9cb-1a906d21f7e3',
          aggregate: 'product',
          commitId: '505d2812-fa9d-4af8-8b88-fb35f7e4cea4',
          revision: 2,
          payload: '{}',
        },
        {
          aggregateId: '0080fedc-f59d-4480-a1bc-73daf4709307',
          aggregate: 'user',
          commitId: 'db6fe2ff-1023-4453-9b00-35b83f563c7a',
          revision: 2,
          payload: '{}',
        },
        {
          aggregateId: 'dfe2bbcc-506f-49d6-a450-0836a9aa5506',
          aggregate: 'user',
          commitId: '324c360e-2367-450d-aab3-dabb9ff4b4da',
          revision: 1,
          payload: '{}',
        },
        {
          aggregateId: 'cd452c3b-7d6f-49f5-b9cb-1a906d21f7e3',
          aggregate: 'product',
          commitId: '8e2551b1-5423-4a35-a34a-59efbc9197fe',
          revision: 3,
          payload: '{}',
        },
      ])
    })
}
