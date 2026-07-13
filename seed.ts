import { db } from './src/lib/db';
import { hash } from 'bcryptjs';

async function seed() {
  console.log('Seeding database...');

  // Clean existing data
  await db.activity.deleteMany();
  await db.notification.deleteMany();
  await db.task.deleteMany();
  await db.deal.deleteMany();
  await db.propertyAmenity.deleteMany();
  await db.propertyPhoto.deleteMany();
  await db.client.deleteMany();
  await db.property.deleteMany();
  await db.user.deleteMany();

  // Create Admin user
  const adminPassword = await hash('admin123', 10);
  const admin = await db.user.create({
    data: {
      email: 'admin@propcrm.com',
      password: adminPassword,
      name: 'Rajesh Sharma',
      phone: '+91 98765 43210',
      role: 'ADMIN',
    },
  });

  // Create Agent users
  const agentPassword = await hash('agent123', 10);
  const agent1 = await db.user.create({
    data: {
      email: 'priya@propcrm.com',
      password: agentPassword,
      name: 'Priya Patel',
      phone: '+91 87654 32109',
      role: 'AGENT',
    },
  });

  const agent2 = await db.user.create({
    data: {
      email: 'arjun@propcrm.com',
      password: agentPassword,
      name: 'Arjun Mehta',
      phone: '+91 76543 21098',
      role: 'AGENT',
    },
  });

  // Create Properties for Agent 1
  const props1 = [
    {
      title: 'Skyline Heights 3BHK',
      propertyType: 'Apartment',
      bedrooms: 3, bathrooms: 2, carpetArea: 1450, price: 85, priceUnit: 'Lakhs',
      floorNumber: 7, totalFloors: 22, ageOfProperty: '0-5', facing: 'SE',
      locality: 'Hinjewadi Phase 1', city: 'Pune', pincode: '411057',
      fullAddress: 'Flat 704, Skyline Heights, Hinjewadi Phase 1, Pune - 411057',
      landmark: 'Near Hinjewadi IT Park',
      latitude: 18.5921, longitude: 73.7396,
      reraNumber: 'A52100030497',
      developerName: 'Skyline Builders', projectName: 'Skyline Heights',
      contactPerson: 'Vikram Desai', contactPhone: '+91 99887 76655',
      description: 'Premium 3BHK apartment with modern amenities and excellent connectivity to IT parks.',
      furnishing: 'Semi-Furnished', status: 'Active', assignedToId: agent1.id,
    },
    {
      title: 'Green Valley Villa',
      propertyType: 'Villa',
      bedrooms: 4, bathrooms: 3, carpetArea: 3200, price: 2.5, priceUnit: 'Crore',
      floorNumber: null, totalFloors: 2, ageOfProperty: 'New', facing: 'E',
      locality: 'Kothrud', city: 'Pune', pincode: '411038',
      fullAddress: 'Plot 45, Green Valley, Paud Road, Kothrud, Pune - 411038',
      landmark: 'Behind City Mall',
      latitude: 18.5074, longitude: 73.8070,
      description: 'Luxurious independent villa with private garden and modern interiors.',
      furnishing: 'Fully Furnished', status: 'Active', assignedToId: agent1.id,
    },
    {
      title: 'Urban Nest Studio',
      propertyType: 'Studio',
      bedrooms: 1, bathrooms: 1, carpetArea: 550, price: 32, priceUnit: 'Lakhs',
      floorNumber: 12, totalFloors: 18, ageOfProperty: '0-5', facing: 'N',
      locality: 'Baner', city: 'Pune', pincode: '411045',
      fullAddress: 'Flat 1201, Urban Nest, Baner, Pune - 411045',
      landmark: 'Near Balewadi Stadium',
      latitude: 18.5591, longitude: 73.7773,
      developerName: 'Urban Spaces', projectName: 'Urban Nest',
      description: 'Compact studio perfect for young professionals. Great investment opportunity.',
      furnishing: 'Unfurnished', status: 'Active', assignedToId: agent1.id,
    },
    {
      title: 'Royal Penthous Suite',
      propertyType: 'Penthouse',
      bedrooms: 5, bathrooms: 4, carpetArea: 4500, price: 5.8, priceUnit: 'Crore',
      floorNumber: 30, totalFloors: 32, ageOfProperty: 'New', facing: 'SW',
      locality: 'Viman Nagar', city: 'Pune', pincode: '411014',
      fullAddress: 'Penthouse, Royal Towers, Viman Nagar, Pune - 411014',
      landmark: 'Opposite Phoenix Mall',
      latitude: 18.5662, longitude: 73.9122,
      reraNumber: 'A52100030901',
      developerName: 'Royal Realty', projectName: 'Royal Towers',
      description: 'Ultra-luxury penthouse with panoramic city views, private terrace, and world-class amenities.',
      furnishing: 'Fully Furnished', status: 'Pending', assignedToId: agent1.id,
    },
    {
      title: 'Commercial Office Space',
      propertyType: 'Commercial',
      bedrooms: null, bathrooms: 2, carpetArea: 2000, price: 1.2, priceUnit: 'Crore',
      floorNumber: 5, totalFloors: 10, ageOfProperty: '5-10', facing: 'W',
      locality: 'Magarpatta', city: 'Pune', pincode: '411028',
      fullAddress: 'Office 501, Magarpatta City, Hadapsar, Pune - 411028',
      landmark: 'Inside Magarpatta Township',
      latitude: 18.5149, longitude: 73.9276,
      description: 'Well-equipped commercial office space in prime IT hub location.',
      furnishing: 'Semi-Furnished', status: 'Active', assignedToId: agent1.id,
    },
  ];

  // Create Properties for Agent 2
  const props2 = [
    {
      title: 'Lakeview 2BHK',
      propertyType: 'Apartment',
      bedrooms: 2, bathrooms: 2, carpetArea: 980, price: 55, priceUnit: 'Lakhs',
      floorNumber: 4, totalFloors: 15, ageOfProperty: '5-10', facing: 'NE',
      locality: 'Pashan', city: 'Pune', pincode: '411021',
      fullAddress: 'Flat 402, Lakeview Residency, Pashan, Pune - 411021',
      landmark: 'Near Pashan Lake',
      latitude: 18.5370, longitude: 73.8005,
      developerName: 'Lakeview Developers', projectName: 'Lakeview Residency',
      description: 'Scenic 2BHK overlooking Pashan Lake. Peaceful residential area.',
      furnishing: 'Unfurnished', status: 'Active', assignedToId: agent2.id,
    },
    {
      title: 'Sangamvi Plot',
      propertyType: 'Plot',
      bedrooms: null, bathrooms: null, carpetArea: 5000, price: 3.5, priceUnit: 'Crore',
      floorNumber: null, totalFloors: null, ageOfProperty: null, facing: 'S',
      locality: 'Sangamvadi', city: 'Pune', pincode: '411001',
      fullAddress: 'Plot No. 23, Sangamvadi, Pune - 411001',
      landmark: 'Near Junglee Maharaj Road',
      latitude: 18.5308, longitude: 73.8471,
      description: 'Prime residential plot in heart of Pune. Ideal for building a dream home.',
      furnishing: null, status: 'Active', assignedToId: agent2.id,
    },
    {
      title: 'Amanora 4BHK Flat',
      propertyType: 'Apartment',
      bedrooms: 4, bathrooms: 3, carpetArea: 2200, price: 1.8, priceUnit: 'Crore',
      floorNumber: 18, totalFloors: 28, ageOfProperty: '0-5', facing: 'E',
      locality: 'Hadapsar', city: 'Pune', pincode: '411028',
      fullAddress: 'Flat 1801, Amanora Park Town, Hadapsar, Pune - 411028',
      landmark: 'Amanora Mall',
      latitude: 18.5018, longitude: 73.9258,
      reraNumber: 'A52100030512',
      developerName: 'City Group', projectName: 'Amanora Park Town',
      contactPerson: 'Sanjay Kulkarni', contactPhone: '+91 98765 12345',
      description: 'Spacious 4BHK in premium township with world-class amenities and security.',
      furnishing: 'Semi-Furnished', status: 'Sold', assignedToId: agent2.id,
    },
  ];

  const allProps = [];
  for (const p of [...props1, ...props2]) {
    const prop = await db.property.create({ data: p });
    allProps.push(prop);
  }

  // Add amenities to properties
  const amenitySets: Record<number, string[]> = {
    0: ['Gym', 'Swimming Pool', 'Parking', 'Security', 'Lift', 'Power Backup', 'Clubhouse', 'Garden'],
    1: ['Garden', 'Parking', 'Security', 'Power Backup'],
    2: ['Gym', 'Parking', 'Lift', 'Power Backup'],
    3: ['Gym', 'Swimming Pool', 'Parking', 'Security', 'Clubhouse', 'Lift', 'Power Backup', 'Garden', 'Concierge', 'Jacuzzi'],
    4: ['Parking', 'Security', 'Lift', 'Power Backup', 'CCTV'],
    5: ['Parking', 'Security', 'Garden', 'Lift'],
    6: ['Security', 'Power Backup'],
    7: ['Gym', 'Swimming Pool', 'Parking', 'Security', 'Clubhouse', 'Lift', 'Power Backup', 'Garden', 'Children Play Area'],
  };

  for (const [idx, amenities] of Object.entries(amenitySets)) {
    const propId = allProps[parseInt(idx)].id;
    for (const a of amenities) {
      await db.propertyAmenity.create({ data: { propertyId: propId, amenity: a } });
    }
  }

  // Create Clients
  const clients1 = [
    {
      name: 'Amit Deshmukh', phone: '+91 90112 33445', email: 'amit.d@gmail.com',
      clientType: 'Buyer', priority: 'Hot', budgetMin: 50, budgetMax: 90,
      preferredLocation: 'Hinjewadi, Baner', preferredType: 'Apartment', preferredBeds: 3,
      preferredFurnish: 'Semi-Furnished', leadSource: 'Website', status: 'Site Visit Scheduled',
      notes: 'Looking for 3BHK near IT park. Working professional at Infosys.', assignedToId: agent1.id,
    },
    {
      name: 'Sneha Kulkarni', phone: '+91 88997 76655', email: 'sneha.k@outlook.com',
      clientType: 'Buyer', priority: 'Warm', budgetMin: 30, budgetMax: 50,
      preferredLocation: 'Kothrud, Pashan', preferredType: 'Apartment', preferredBeds: 2,
      preferredFurnish: 'Unfurnished', leadSource: 'Referral', status: 'Contacted',
      notes: 'Referred by existing client. First-time buyer.', assignedToId: agent1.id,
    },
    {
      name: 'Vikram Joshi', phone: '+91 77665 54433', email: 'vikram.j@yahoo.com',
      clientType: 'Investor', priority: 'Hot', budgetMin: 100, budgetMax: 300,
      preferredLocation: 'Viman Nagar, Kharadi', preferredType: 'Apartment', preferredBeds: 3,
      leadSource: 'MagicBricks', status: 'Negotiation',
      notes: 'Looking for investment properties. Wants good ROI locations.', assignedToId: agent1.id,
    },
    {
      name: 'Pallavi Rane', phone: '+91 66554 43322', email: 'pallavi.r@gmail.com',
      clientType: 'Seller', priority: 'Warm', leadSource: 'Walk-in',
      status: 'New Lead', notes: 'Wants to sell 2BHK in Warje. Need to visit property first.',
      reminderDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      reminderNote: 'Follow up on property visit at Warje',
      assignedToId: agent1.id,
    },
    {
      name: 'Rahul Tiwari', phone: '+91 55443 32211', email: 'rahul.t@gmail.com',
      clientType: 'Tenant', priority: 'Cold', budgetMin: 15, budgetMax: 25,
      preferredLocation: 'Hinjewadi', preferredType: 'Apartment', preferredBeds: 1,
      leadSource: '99Acres', status: 'New Lead',
      notes: 'Looking for 1BHK on rent near office.', assignedToId: agent1.id,
    },
  ];

  const clients2 = [
    {
      name: 'Deepa Nair', phone: '+91 44332 21109', email: 'deepa.n@gmail.com',
      clientType: 'Buyer', priority: 'Hot', budgetMin: 150, budgetMax: 250,
      preferredLocation: 'Hadapsar, Magarpatta', preferredType: 'Villa', preferredBeds: 4,
      preferredFurnish: 'Fully Furnished', leadSource: 'Housing.com', status: 'Negotiation',
      notes: 'Family of 5. Wants gated community with amenities.', assignedToId: agent2.id,
    },
    {
      name: 'Suresh Iyer', phone: '+91 33221 10998', email: 'suresh.i@gmail.com',
      clientType: 'Buyer', priority: 'Warm', budgetMin: 40, budgetMax: 60,
      preferredLocation: 'Pashan, Baner', preferredType: 'Apartment', preferredBeds: 2,
      leadSource: 'JustDial', status: 'Contacted',
      notes: 'IT professional relocating from Mumbai. Needs possession within 3 months.', assignedToId: agent2.id,
    },
    {
      name: 'Meera Shah', phone: '+91 22110 99887', email: 'meera.s@gmail.com',
      clientType: 'Investor', priority: 'Hot', budgetMin: 200, budgetMax: 500,
      preferredLocation: 'Any prime location', preferredType: 'Commercial',
      leadSource: 'Referral', status: 'Site Visit Scheduled',
      notes: 'Interested in commercial office spaces. High net worth individual.',
      reminderDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      reminderNote: 'Schedule site visits for commercial properties',
      assignedToId: agent2.id,
    },
  ];

  const allClients = [];
  for (const c of [...clients1, ...clients2]) {
    const client = await db.client.create({ data: c });
    allClients.push(client);
  }

  // Create Deals
  const dealsData = [
    { propertyId: allProps[0].id, clientId: allClients[0].id, stage: 'Site Visit', dealValue: 85, expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), assignedToId: agent1.id, notes: 'Client interested. Site visit scheduled for this weekend.' },
    { propertyId: allProps[3].id, clientId: allClients[2].id, stage: 'Negotiation', dealValue: 550, expectedCloseDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), assignedToId: agent1.id, notes: 'Negotiating on price. Client wants 5% discount.' },
    { propertyId: allProps[1].id, clientId: allClients[2].id, stage: 'Token Advance', dealValue: 250, expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), assignedToId: agent1.id, notes: 'Token amount received. Processing paperwork.' },
    { propertyId: allProps[5].id, clientId: allClients[5].id, stage: 'Lead', dealValue: 55, expectedCloseDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), assignedToId: agent2.id, notes: 'Initial inquiry made.' },
    { propertyId: allProps[7].id, clientId: allClients[5].id, stage: 'Booking', dealValue: 180, expectedCloseDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), assignedToId: agent2.id, notes: 'Booking amount confirmed. Finalizing agreement.' },
    { propertyId: allProps[4].id, clientId: allClients[6].id, stage: 'Lead', dealValue: 120, expectedCloseDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000), assignedToId: agent2.id, notes: 'Investor interested in commercial space.' },
  ];

  const allDeals = [];
  for (const d of dealsData) {
    const deal = await db.deal.create({ data: d });
    allDeals.push(deal);
  }

  // Create Tasks
  const now = new Date();
  const tasksData = [
    { title: 'Follow up with Amit Deshmukh', description: 'Discuss site visit feedback for Skyline Heights', dueDate: new Date(now.toISOString().split('T')[0]), priority: 'High', assignedToId: agent1.id, propertyId: allProps[0].id, clientId: allClients[0].id, dealId: allDeals[0].id },
    { title: 'Prepare property valuation report', description: 'For Green Valley Villa - client request', dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), priority: 'Medium', assignedToId: agent1.id, propertyId: allProps[1].id },
    { title: 'Schedule site visit for Pallavi', description: 'Visit property at Warje for valuation', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), priority: 'High', assignedToId: agent1.id, clientId: allClients[3].id },
    { title: 'Send property details to Rahul', description: 'Email 1BHK options in Hinjewadi', dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), priority: 'Low', assignedToId: agent1.id, clientId: allClients[4].id },
    { title: 'Follow up on Royal Penthouse deal', description: 'Check with Vikram on penthouse negotiation progress', dueDate: new Date(now.toISOString().split('T')[0]), priority: 'High', assignedToId: agent1.id, dealId: allDeals[1].id },
    { title: 'Update property photos', description: 'Add new photos for Skyline Heights listing', dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), priority: 'Medium', assignedToId: agent1.id, propertyId: allProps[0].id },
    { title: 'Follow up with Deepa Nair', description: 'Discuss final pricing for Amanora flat', dueDate: new Date(now.toISOString().split('T')[0]), priority: 'High', assignedToId: agent2.id, clientId: allClients[5].id, dealId: allDeals[4].id },
    { title: 'Schedule commercial site visits', description: 'For Meera Shah - office spaces in Magarpatta', dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), priority: 'High', assignedToId: agent2.id, clientId: allClients[6].id, dealId: allDeals[5].id },
    { title: 'Prepare investment proposal', description: 'Commercial property ROI analysis for investor', dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), priority: 'Medium', assignedToId: agent2.id, propertyId: allProps[4].id, clientId: allClients[6].id },
    { title: 'Complete client documentation', description: 'Finish KYC for Suresh Iyer', dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), priority: 'Medium', isCompleted: true, assignedToId: agent2.id, clientId: allClients[6].id },
  ];

  const allTasks = [];
  for (const t of tasksData) {
    const task = await db.task.create({ data: t as any });
    allTasks.push(task);
  }

  // Create auto-tasks from client reminders
  for (const client of allClients) {
    if (client.reminderDate && !client.reminderDone) {
      await db.task.create({
        data: {
          title: `Reminder: ${client.name}`,
          description: client.reminderNote || 'Client follow-up reminder',
          dueDate: client.reminderDate,
          priority: 'High',
          assignedToId: client.assignedToId,
          clientId: client.id,
        },
      });
    }
  }

  // Create Notifications
  const notifications = [
    { userId: agent1.id, type: 'task_due', title: 'Task Due Today', description: 'Follow up with Amit Deshmukh is due today', linkTo: `task:${allTasks[0].id}` },
    { userId: agent1.id, type: 'task_overdue', title: 'Overdue Task', description: 'Send property details to Rahul was due yesterday', linkTo: `task:${allTasks[3].id}` },
    { userId: agent1.id, type: 'deal_stage', title: 'Deal Stage Updated', description: 'Token Advance received for Green Valley Villa deal', linkTo: `deal:${allDeals[2].id}` },
    { userId: agent1.id, type: 'new_lead', title: 'New Lead', description: 'Pallavi Rane registered as a new lead', linkTo: `client:${allClients[3].id}` },
    { userId: agent2.id, type: 'task_due', title: 'Task Due Today', description: 'Follow up with Deepa Nair is due today', linkTo: `task:${allTasks[6].id}` },
    { userId: agent2.id, type: 'deal_stage', title: 'Deal Stage Updated', description: 'Amanora 4BHK deal moved to Booking stage', linkTo: `deal:${allDeals[4].id}` },
    { userId: agent2.id, type: 'new_lead', title: 'New Lead', description: 'Meera Shah registered as an investor lead', linkTo: `client:${allClients[6].id}` },
    { userId: admin.id, type: 'system', title: 'Welcome to Realty Pinnacle CRM', description: 'Your account has been set up as Super Admin. Manage your team from Settings.', linkTo: null },
    { userId: admin.id, type: 'deal_stage', title: 'New Deal Created', description: 'Priya Patel created a deal for Skyline Heights', linkTo: `deal:${allDeals[0].id}` },
    { userId: admin.id, type: 'deal_stage', title: 'New Deal Created', description: 'Arjun Mehta created a deal for Amanora 4BHK', linkTo: `deal:${allDeals[4].id}` },
  ];

  for (let i = 0; i < notifications.length; i++) {
    await db.notification.create({
      data: { ...notifications[i], isRead: i < 2 },
    });
  }

  // Create Activity Log
  const activities = [
    { userId: agent1.id, entityType: 'Property', entityId: allProps[0].id, action: 'created', description: 'Added new listing: Skyline Heights 3BHK' },
    { userId: agent1.id, entityType: 'Client', entityId: allClients[0].id, action: 'created', description: 'New lead: Amit Deshmukh registered via website' },
    { userId: agent1.id, entityType: 'Deal', entityId: allDeals[0].id, action: 'created', description: 'Created deal: Skyline Heights - Amit Deshmukh' },
    { userId: agent1.id, entityType: 'Deal', entityId: allDeals[0].id, action: 'status_changed', description: 'Deal moved to Site Visit stage' },
    { userId: agent1.id, entityType: 'Deal', entityId: allDeals[2].id, action: 'status_changed', description: 'Token Advance received for Green Valley Villa deal' },
    { userId: agent1.id, entityType: 'Client', entityId: allClients[3].id, action: 'created', description: 'New lead: Pallavi Rane - Seller from walk-in' },
    { userId: agent2.id, entityType: 'Property', entityId: allProps[5].id, action: 'created', description: 'Added new listing: Lakeview 2BHK' },
    { userId: agent2.id, entityType: 'Client', entityId: allClients[5].id, action: 'created', description: 'New lead: Deepa Nair from Housing.com' },
    { userId: agent2.id, entityType: 'Deal', entityId: allDeals[4].id, action: 'status_changed', description: 'Amanora 4BHK deal moved to Booking stage' },
    { userId: agent2.id, entityType: 'Task', entityId: allTasks[9].id, action: 'updated', description: 'Completed: KYC documentation for Suresh Iyer' },
  ];

  for (const a of activities) {
    await db.activity.create({ data: a });
  }

  console.log('Seed completed successfully!');
  console.log(`Created: ${2 + 1} users, ${allProps.length} properties, ${allClients.length} clients, ${allDeals.length} deals, ${allTasks.length + 2} tasks`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });