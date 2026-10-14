/**
 * Comprehensive Indian Cities, Districts, Mandals, and Major Localities
 * Providing 0-millisecond offline location autocomplete (BookMyShow / Google Maps style)
 */

export const INDIAN_CITIES = [
  // ==========================================
  // ANDHRA PRADESH - ALL DISTRICTS & MAJOR TOWNS
  // ==========================================
  // Nandyal District
  { name: 'Nandyal', city: 'Nandyal', district: 'Nandyal', state: 'Andhra Pradesh', latitude: 15.4736, longitude: 78.4807, isPopular: true, order: 12, type: 'CITY' },
  { name: 'Nandyal Mandal', city: 'Nandyal', district: 'Nandyal', state: 'Andhra Pradesh', latitude: 15.4748, longitude: 78.4785, type: 'MANDAL' },
  { name: 'Saleem Nagar', city: 'Nandyal', district: 'Nandyal', state: 'Andhra Pradesh', latitude: 15.4692, longitude: 78.4705, type: 'LOCALITY' },
  { name: 'Srinivasa Nagar', city: 'Nandyal', district: 'Nandyal', state: 'Andhra Pradesh', latitude: 15.4812, longitude: 78.4856, type: 'LOCALITY' },
  { name: 'Nandyal RTC Bus Stand', city: 'Nandyal', district: 'Nandyal', state: 'Andhra Pradesh', latitude: 15.4801, longitude: 78.4792, type: 'LANDMARK' },
  { name: 'Nandyal Railway Station', city: 'Nandyal', district: 'Nandyal', state: 'Andhra Pradesh', latitude: 15.4688, longitude: 78.4891, type: 'LANDMARK' },
  { name: 'Allagadda', city: 'Allagadda', district: 'Nandyal', state: 'Andhra Pradesh', latitude: 15.1324, longitude: 78.5097, type: 'TOWN' },
  { name: 'Banaganapalle', city: 'Banaganapalle', district: 'Nandyal', state: 'Andhra Pradesh', latitude: 15.3167, longitude: 78.2333, type: 'TOWN' },
  { name: 'Dhone', city: 'Dhone', district: 'Nandyal', state: 'Andhra Pradesh', latitude: 15.4167, longitude: 77.8667, type: 'TOWN' },
  { name: 'Koilkuntla', city: 'Koilkuntla', district: 'Nandyal', state: 'Andhra Pradesh', latitude: 15.2333, longitude: 78.3167, type: 'TOWN' },
  { name: 'Nandikotkur', city: 'Nandikotkur', district: 'Nandyal', state: 'Andhra Pradesh', latitude: 15.8667, longitude: 78.2667, type: 'TOWN' },
  { name: 'Atmakur', city: 'Atmakur', district: 'Nandyal', state: 'Andhra Pradesh', latitude: 15.8833, longitude: 78.6167, type: 'TOWN' },
  { name: 'Srisailam', city: 'Srisailam', district: 'Nandyal', state: 'Andhra Pradesh', latitude: 16.0739, longitude: 78.8687, type: 'TOWN' },
  { name: 'Betamcherla', city: 'Betamcherla', district: 'Nandyal', state: 'Andhra Pradesh', latitude: 15.4500, longitude: 78.1667, type: 'TOWN' },

  // Kurnool District
  { name: 'Kurnool', city: 'Kurnool', district: 'Kurnool', state: 'Andhra Pradesh', latitude: 15.8309, longitude: 78.0425, isPopular: true, order: 11, type: 'CITY' },
  { name: 'Adoni', city: 'Adoni', district: 'Kurnool', state: 'Andhra Pradesh', latitude: 15.6322, longitude: 77.2728, type: 'CITY' },
  { name: 'Yemmiganur', city: 'Yemmiganur', district: 'Kurnool', state: 'Andhra Pradesh', latitude: 15.7667, longitude: 77.4833, type: 'TOWN' },
  { name: 'Alur', city: 'Alur', district: 'Kurnool', state: 'Andhra Pradesh', latitude: 15.3000, longitude: 77.2333, type: 'TOWN' },
  { name: 'Pattikonda', city: 'Pattikonda', district: 'Kurnool', state: 'Andhra Pradesh', latitude: 15.4000, longitude: 77.5167, type: 'TOWN' },
  { name: 'Kodumur', city: 'Kodumur', district: 'Kurnool', state: 'Andhra Pradesh', latitude: 15.6833, longitude: 77.7833, type: 'TOWN' },

  // Guntur District & Localities
  { name: 'Guntur', city: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh', latitude: 16.3067, longitude: 80.4365, isPopular: true, order: 1, type: 'CITY' },
  { name: 'Broadipet', city: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh', latitude: 16.3050, longitude: 80.4320, type: 'LOCALITY' },
  { name: 'Arundelpet', city: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh', latitude: 16.3080, longitude: 80.4380, type: 'LOCALITY' },
  { name: 'Lakshmipuram', city: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh', latitude: 16.2990, longitude: 80.4450, type: 'LOCALITY' },
  { name: 'Kothapet', city: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh', latitude: 16.3120, longitude: 80.4410, type: 'LOCALITY' },
  { name: 'Pattabhipuram', city: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh', latitude: 16.3010, longitude: 80.4280, type: 'LOCALITY' },
  { name: 'Syamala Nagar', city: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh', latitude: 16.2950, longitude: 80.4320, type: 'LOCALITY' },
  { name: 'Tenali', city: 'Tenali', district: 'Guntur', state: 'Andhra Pradesh', latitude: 16.2430, longitude: 80.6400, type: 'CITY' },
  { name: 'Mangalagiri', city: 'Mangalagiri', district: 'Guntur', state: 'Andhra Pradesh', latitude: 16.4300, longitude: 80.5500, type: 'TOWN' },
  { name: 'Tadepalli', city: 'Tadepalli', district: 'Guntur', state: 'Andhra Pradesh', latitude: 16.4800, longitude: 80.6000, type: 'TOWN' },
  { name: 'Ponnur', city: 'Ponnur', district: 'Guntur', state: 'Andhra Pradesh', latitude: 16.0667, longitude: 80.5667, type: 'TOWN' },

  // NTR & Krishna Districts (Vijayawada)
  { name: 'Vijayawada', city: 'Vijayawada', district: 'NTR', state: 'Andhra Pradesh', latitude: 16.5062, longitude: 80.6480, isPopular: true, order: 2, type: 'CITY' },
  { name: 'Benz Circle', city: 'Vijayawada', district: 'NTR', state: 'Andhra Pradesh', latitude: 16.5020, longitude: 80.6550, type: 'LOCALITY' },
  { name: 'Labbipet', city: 'Vijayawada', district: 'NTR', state: 'Andhra Pradesh', latitude: 16.5080, longitude: 80.6400, type: 'LOCALITY' },
  { name: 'Governorpet', city: 'Vijayawada', district: 'NTR', state: 'Andhra Pradesh', latitude: 16.5120, longitude: 80.6280, type: 'LOCALITY' },
  { name: 'Moghalrajpuram', city: 'Vijayawada', district: 'NTR', state: 'Andhra Pradesh', latitude: 16.5050, longitude: 80.6480, type: 'LOCALITY' },
  { name: 'Patamata', city: 'Vijayawada', district: 'NTR', state: 'Andhra Pradesh', latitude: 16.4950, longitude: 80.6650, type: 'LOCALITY' },
  { name: 'Machilipatnam', city: 'Machilipatnam', district: 'Krishna', state: 'Andhra Pradesh', latitude: 16.1875, longitude: 81.1389, type: 'CITY' },
  { name: 'Gudivada', city: 'Gudivada', district: 'Krishna', state: 'Andhra Pradesh', latitude: 16.4333, longitude: 80.9833, type: 'CITY' },
  { name: 'Nuzvid', city: 'Nuzvid', district: 'Eluru', state: 'Andhra Pradesh', latitude: 16.7833, longitude: 80.8500, type: 'TOWN' },
  { name: 'Jaggayyapeta', city: 'Jaggayyapeta', district: 'NTR', state: 'Andhra Pradesh', latitude: 16.8900, longitude: 80.0900, type: 'TOWN' },
  { name: 'Nandigama', city: 'Nandigama', district: 'NTR', state: 'Andhra Pradesh', latitude: 16.7667, longitude: 80.3000, type: 'TOWN' },

  // Visakhapatnam & North Coastal AP
  { name: 'Visakhapatnam', city: 'Visakhapatnam', district: 'Visakhapatnam', state: 'Andhra Pradesh', latitude: 17.6868, longitude: 83.2185, isPopular: true, order: 9, type: 'CITY' },
  { name: 'Gajuwaka', city: 'Visakhapatnam', district: 'Visakhapatnam', state: 'Andhra Pradesh', latitude: 17.6900, longitude: 83.1800, type: 'LOCALITY' },
  { name: 'Madhurawada', city: 'Visakhapatnam', district: 'Visakhapatnam', state: 'Andhra Pradesh', latitude: 17.8100, longitude: 83.3500, type: 'LOCALITY' },
  { name: 'MVP Colony', city: 'Visakhapatnam', district: 'Visakhapatnam', state: 'Andhra Pradesh', latitude: 17.7380, longitude: 83.3320, type: 'LOCALITY' },
  { name: 'Anakapalle', city: 'Anakapalle', district: 'Anakapalli', state: 'Andhra Pradesh', latitude: 17.6913, longitude: 83.0039, type: 'CITY' },
  { name: 'Vizianagaram', city: 'Vizianagaram', district: 'Vizianagaram', state: 'Andhra Pradesh', latitude: 18.1167, longitude: 83.4167, type: 'CITY' },
  { name: 'Srikakulam', city: 'Srikakulam', district: 'Srikakulam', state: 'Andhra Pradesh', latitude: 18.3000, longitude: 83.9000, type: 'CITY' },

  // Godavari Districts
  { name: 'Rajahmundry', city: 'Rajahmundry', district: 'East Godavari', state: 'Andhra Pradesh', latitude: 17.0005, longitude: 81.8040, isPopular: true, order: 13, type: 'CITY' },
  { name: 'Kakinada', city: 'Kakinada', district: 'Kakinada', state: 'Andhra Pradesh', latitude: 16.9891, longitude: 82.2475, isPopular: true, order: 14, type: 'CITY' },
  { name: 'Eluru', city: 'Eluru', district: 'Eluru', state: 'Andhra Pradesh', latitude: 16.7107, longitude: 81.0952, type: 'CITY' },
  { name: 'Bhimavaram', city: 'Bhimavaram', district: 'West Godavari', state: 'Andhra Pradesh', latitude: 16.5449, longitude: 81.5212, type: 'CITY' },
  { name: 'Tadepalligudem', city: 'Tadepalligudem', district: 'West Godavari', state: 'Andhra Pradesh', latitude: 16.8130, longitude: 81.5260, type: 'CITY' },
  { name: 'Tanuku', city: 'Tanuku', district: 'West Godavari', state: 'Andhra Pradesh', latitude: 16.7560, longitude: 81.6810, type: 'TOWN' },
  { name: 'Palakollu', city: 'Palakollu', district: 'West Godavari', state: 'Andhra Pradesh', latitude: 16.5200, longitude: 81.7300, type: 'TOWN' },
  { name: 'Narsapuram', city: 'Narsapuram', district: 'West Godavari', state: 'Andhra Pradesh', latitude: 16.4350, longitude: 81.7010, type: 'TOWN' },
  { name: 'Amalapuram', city: 'Amalapuram', district: 'Konaseema', state: 'Andhra Pradesh', latitude: 16.5787, longitude: 82.0061, type: 'CITY' },

  // Rayalaseema & South Coastal AP
  { name: 'Tirupati', city: 'Tirupati', district: 'Tirupati', state: 'Andhra Pradesh', latitude: 13.6288, longitude: 79.4192, isPopular: true, order: 10, type: 'CITY' },
  { name: 'Kadapa', city: 'Kadapa', district: 'YSR', state: 'Andhra Pradesh', latitude: 14.4673, longitude: 78.8242, isPopular: true, order: 15, type: 'CITY' },
  { name: 'Proddatur', city: 'Proddatur', district: 'YSR', state: 'Andhra Pradesh', latitude: 14.7500, longitude: 78.5500, type: 'CITY' },
  { name: 'Anantapur', city: 'Anantapur', district: 'Anantapur', state: 'Andhra Pradesh', latitude: 14.6819, longitude: 77.6006, isPopular: true, order: 16, type: 'CITY' },
  { name: 'Guntakal', city: 'Guntakal', district: 'Anantapur', state: 'Andhra Pradesh', latitude: 15.1700, longitude: 77.3800, type: 'CITY' },
  { name: 'Tadipatri', city: 'Tadipatri', district: 'Anantapur', state: 'Andhra Pradesh', latitude: 14.9100, longitude: 78.0100, type: 'CITY' },
  { name: 'Hindupur', city: 'Hindupur', district: 'Sri Sathya Sai', state: 'Andhra Pradesh', latitude: 13.8289, longitude: 77.4919, type: 'CITY' },
  { name: 'Dharmavaram', city: 'Dharmavaram', district: 'Sri Sathya Sai', state: 'Andhra Pradesh', latitude: 14.4140, longitude: 77.7180, type: 'CITY' },
  { name: 'Nellore', city: 'Nellore', district: 'Nellore', state: 'Andhra Pradesh', latitude: 14.4426, longitude: 79.9865, isPopular: true, order: 17, type: 'CITY' },
  { name: 'Ongole', city: 'Ongole', district: 'Prakasam', state: 'Andhra Pradesh', latitude: 15.5057, longitude: 80.0499, isPopular: true, order: 18, type: 'CITY' },
  { name: 'Chirala', city: 'Chirala', district: 'Bapatla', state: 'Andhra Pradesh', latitude: 15.8200, longitude: 80.3500, type: 'CITY' },
  { name: 'Bapatla', city: 'Bapatla', district: 'Bapatla', state: 'Andhra Pradesh', latitude: 15.9042, longitude: 80.4678, type: 'CITY' },
  { name: 'Narasaraopet', city: 'Narasaraopet', district: 'Palnadu', state: 'Andhra Pradesh', latitude: 16.2360, longitude: 80.0520, type: 'CITY' },
  { name: 'Chittoor', city: 'Chittoor', district: 'Chittoor', state: 'Andhra Pradesh', latitude: 13.2172, longitude: 79.1003, type: 'CITY' },
  { name: 'Madanapalle', city: 'Madanapalle', district: 'Annamayya', state: 'Andhra Pradesh', latitude: 13.5500, longitude: 78.5000, type: 'CITY' },
  { name: 'Rayachoti', city: 'Rayachoti', district: 'Annamayya', state: 'Andhra Pradesh', latitude: 14.0570, longitude: 78.7520, type: 'TOWN' },

  // ==========================================
  // TELANGANA - ALL MAJOR HUBS
  // ==========================================
  { name: 'Hyderabad', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', latitude: 17.3850, longitude: 78.4867, isPopular: true, order: 3, type: 'CITY' },
  { name: 'Secunderabad', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', latitude: 17.4399, longitude: 78.4983, type: 'LOCALITY' },
  { name: 'Hitech City', city: 'Hyderabad', district: 'Rangareddy', state: 'Telangana', latitude: 17.4435, longitude: 78.3772, type: 'LOCALITY' },
  { name: 'Gachibowli', city: 'Hyderabad', district: 'Rangareddy', state: 'Telangana', latitude: 17.4401, longitude: 78.3489, type: 'LOCALITY' },
  { name: 'Madhapur', city: 'Hyderabad', district: 'Rangareddy', state: 'Telangana', latitude: 17.4483, longitude: 78.3915, type: 'LOCALITY' },
  { name: 'Kukatpally', city: 'Hyderabad', district: 'Medchal-Malkajgiri', state: 'Telangana', latitude: 17.4849, longitude: 78.4138, type: 'LOCALITY' },
  { name: 'Banjara Hills', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', latitude: 17.4156, longitude: 78.4358, type: 'LOCALITY' },
  { name: 'Jubilee Hills', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', latitude: 17.4319, longitude: 78.4073, type: 'LOCALITY' },
  { name: 'Kondapur', city: 'Hyderabad', district: 'Rangareddy', state: 'Telangana', latitude: 17.4699, longitude: 78.3578, type: 'LOCALITY' },
  { name: 'Miyapur', city: 'Hyderabad', district: 'Rangareddy', state: 'Telangana', latitude: 17.4968, longitude: 78.3614, type: 'LOCALITY' },
  { name: 'Warangal', city: 'Warangal', district: 'Warangal', state: 'Telangana', latitude: 17.9689, longitude: 79.5941, isPopular: true, order: 19, type: 'CITY' },
  { name: 'Hanamkonda', city: 'Hanamkonda', district: 'Hanamkonda', state: 'Telangana', latitude: 18.0138, longitude: 79.5603, type: 'CITY' },
  { name: 'Karimnagar', city: 'Karimnagar', district: 'Karimnagar', state: 'Telangana', latitude: 18.4386, longitude: 79.1288, type: 'CITY' },
  { name: 'Nizamabad', city: 'Nizamabad', district: 'Nizamabad', state: 'Telangana', latitude: 18.6725, longitude: 78.0941, type: 'CITY' },
  { name: 'Khammam', city: 'Khammam', district: 'Khammam', state: 'Telangana', latitude: 17.2473, longitude: 80.1514, type: 'CITY' },
  { name: 'Ramagundam', city: 'Ramagundam', district: 'Peddapalli', state: 'Telangana', latitude: 18.7557, longitude: 79.5126, type: 'CITY' },
  { name: 'Mahbubnagar', city: 'Mahbubnagar', district: 'Mahbubnagar', state: 'Telangana', latitude: 16.7488, longitude: 77.9856, type: 'CITY' },
  { name: 'Nalgonda', city: 'Nalgonda', district: 'Nalgonda', state: 'Telangana', latitude: 17.0500, longitude: 79.2667, type: 'CITY' },
  { name: 'Suryapet', city: 'Suryapet', district: 'Suryapet', state: 'Telangana', latitude: 17.1439, longitude: 79.6239, type: 'CITY' },
  { name: 'Siddipet', city: 'Siddipet', district: 'Siddipet', state: 'Telangana', latitude: 18.1018, longitude: 78.8520, type: 'CITY' },

  // ==========================================
  // METROS & NATIONAL TECH HUBS
  // ==========================================
  // Bengaluru & Major Hubs
  { name: 'Bengaluru', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946, isPopular: true, order: 4, type: 'CITY' },
  { name: 'Indiranagar', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', latitude: 12.9784, longitude: 77.6408, type: 'LOCALITY' },
  { name: 'Koramangala', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', latitude: 12.9352, longitude: 77.6245, type: 'LOCALITY' },
  { name: 'HSR Layout', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', latitude: 12.9121, longitude: 77.6446, type: 'LOCALITY' },
  { name: 'Whitefield', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', latitude: 12.9698, longitude: 77.7499, type: 'LOCALITY' },
  { name: 'Electronic City', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', latitude: 12.8452, longitude: 77.6602, type: 'LOCALITY' },
  { name: 'Jayanagar', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', latitude: 12.9250, longitude: 77.5938, type: 'LOCALITY' },
  { name: 'JP Nagar', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', latitude: 12.9063, longitude: 77.5857, type: 'LOCALITY' },
  { name: 'BTM Layout', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', latitude: 12.9166, longitude: 77.6101, type: 'LOCALITY' },
  { name: 'Marathahalli', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', latitude: 12.9591, longitude: 77.6974, type: 'LOCALITY' },
  { name: 'Mysuru', city: 'Mysuru', district: 'Mysuru', state: 'Karnataka', latitude: 12.2958, longitude: 76.6394, type: 'CITY' },
  { name: 'Mangaluru', city: 'Mangaluru', district: 'Dakshina Kannada', state: 'Karnataka', latitude: 12.9141, longitude: 74.8560, type: 'CITY' },
  { name: 'Hubballi', city: 'Hubballi', district: 'Dharwad', state: 'Karnataka', latitude: 15.3647, longitude: 75.1240, type: 'CITY' },
  { name: 'Belagavi', city: 'Belagavi', district: 'Belagavi', state: 'Karnataka', latitude: 15.8497, longitude: 74.4977, type: 'CITY' },

  // Chennai & Tamil Nadu
  { name: 'Chennai', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707, isPopular: true, order: 5, type: 'CITY' },
  { name: 'T. Nagar', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', latitude: 13.0418, longitude: 80.2341, type: 'LOCALITY' },
  { name: 'Anna Nagar', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', latitude: 13.0850, longitude: 80.2101, type: 'LOCALITY' },
  { name: 'Velachery', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', latitude: 12.9750, longitude: 80.2210, type: 'LOCALITY' },
  { name: 'Adyar', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', latitude: 13.0012, longitude: 80.2565, type: 'LOCALITY' },
  { name: 'Coimbatore', city: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu', latitude: 11.0168, longitude: 76.9558, type: 'CITY' },
  { name: 'Madurai', city: 'Madurai', district: 'Madurai', state: 'Tamil Nadu', latitude: 9.9252, longitude: 78.1198, type: 'CITY' },
  { name: 'Tiruchirappalli', city: 'Tiruchirappalli', district: 'Tiruchirappalli', state: 'Tamil Nadu', latitude: 10.7905, longitude: 78.7047, type: 'CITY' },
  { name: 'Salem', city: 'Salem', district: 'Salem', state: 'Tamil Nadu', latitude: 11.6643, longitude: 78.1460, type: 'CITY' },

  // Mumbai & Maharashtra
  { name: 'Mumbai', city: 'Mumbai', district: 'Mumbai City', state: 'Maharashtra', latitude: 19.0760, longitude: 72.8777, isPopular: true, order: 6, type: 'CITY' },
  { name: 'Pune', city: 'Pune', district: 'Pune', state: 'Maharashtra', latitude: 18.5204, longitude: 73.8567, isPopular: true, order: 8, type: 'CITY' },
  { name: 'Nagpur', city: 'Nagpur', district: 'Nagpur', state: 'Maharashtra', latitude: 21.1458, longitude: 79.0882, type: 'CITY' },
  { name: 'Thane', city: 'Thane', district: 'Thane', state: 'Maharashtra', latitude: 19.2183, longitude: 72.9781, type: 'CITY' },
  { name: 'Nashik', city: 'Nashik', district: 'Nashik', state: 'Maharashtra', latitude: 19.9975, longitude: 73.7898, type: 'CITY' },
  { name: 'Navi Mumbai', city: 'Navi Mumbai', district: 'Thane', state: 'Maharashtra', latitude: 19.0330, longitude: 73.0297, type: 'CITY' },

  // Delhi NCR
  { name: 'Delhi', city: 'Delhi', district: 'Central Delhi', state: 'Delhi', latitude: 28.6139, longitude: 77.2090, isPopular: true, order: 7, type: 'CITY' },
  { name: 'Noida', city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh', latitude: 28.5355, longitude: 77.3910, type: 'CITY' },
  { name: 'Gurugram', city: 'Gurugram', district: 'Gurugram', state: 'Haryana', latitude: 28.4595, longitude: 77.0266, type: 'CITY' },
  { name: 'Ghaziabad', city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh', latitude: 28.6692, longitude: 77.4538, type: 'CITY' },
  { name: 'Faridabad', city: 'Faridabad', district: 'Faridabad', state: 'Haryana', latitude: 28.4089, longitude: 77.3178, type: 'CITY' },

  // Key Capitals & Major Cities
  { name: 'Kolkata', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal', latitude: 22.5726, longitude: 88.3639, type: 'CITY' },
  { name: 'Ahmedabad', city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', latitude: 23.0225, longitude: 72.5714, type: 'CITY' },
  { name: 'Surat', city: 'Surat', district: 'Surat', state: 'Gujarat', latitude: 21.1702, longitude: 72.8311, type: 'CITY' },
  { name: 'Jaipur', city: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', latitude: 26.9124, longitude: 75.7873, type: 'CITY' },
  { name: 'Lucknow', city: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462, type: 'CITY' },
  { name: 'Kanpur', city: 'Kanpur', district: 'Kanpur Nagar', state: 'Uttar Pradesh', latitude: 26.4499, longitude: 80.3319, type: 'CITY' },
  { name: 'Patna', city: 'Patna', district: 'Patna', state: 'Bihar', latitude: 25.5941, longitude: 85.1376, type: 'CITY' },
  { name: 'Indore', city: 'Indore', district: 'Indore', state: 'Madhya Pradesh', latitude: 22.7196, longitude: 75.8577, type: 'CITY' },
  { name: 'Bhopal', city: 'Bhopal', district: 'Bhopal', state: 'Madhya Pradesh', latitude: 23.2599, longitude: 77.4126, type: 'CITY' },
  { name: 'Chandigarh', city: 'Chandigarh', district: 'Chandigarh', state: 'Chandigarh', latitude: 30.7333, longitude: 76.7794, type: 'CITY' },
  { name: 'Kochi', city: 'Kochi', district: 'Ernakulam', state: 'Kerala', latitude: 9.9312, longitude: 76.2673, type: 'CITY' },
  { name: 'Thiruvananthapuram', city: 'Thiruvananthapuram', district: 'Thiruvananthapuram', state: 'Kerala', latitude: 8.5241, longitude: 76.9366, type: 'CITY' },
  { name: 'Bhubaneswar', city: 'Bhubaneswar', district: 'Khurda', state: 'Odisha', latitude: 20.2961, longitude: 85.8245, type: 'CITY' },
  { name: 'Guwahati', city: 'Guwahati', district: 'Kamrup Metropolitan', state: 'Assam', latitude: 26.1445, longitude: 91.7362, type: 'CITY' }
];

export const POPULAR_LOCATIONS = INDIAN_CITIES.filter((c) => c.isPopular).sort((a, b) => (a.order || 99) - (b.order || 99));

/**
 * Instant in-memory search for Indian cities and localities
 */
export function searchIndianCities(queryStr, limit = 10) {
  const q = String(queryStr || '').trim().toLowerCase();
  if (!q) return [];

  const startsWith = [];
  const contains = [];

  for (const item of INDIAN_CITIES) {
    const name = item.name.toLowerCase();
    const city = (item.city || '').toLowerCase();
    const district = (item.district || '').toLowerCase();
    const state = (item.state || '').toLowerCase();

    if (name.startsWith(q) || city.startsWith(q)) {
      startsWith.push(item);
    } else if (name.includes(q) || city.includes(q) || district.includes(q) || state.includes(q)) {
      contains.push(item);
    }
  }

  // Exact/prefix matches prioritized
  const combined = [...startsWith, ...contains];
  const unique = [];
  const seen = new Set();

  for (const item of combined) {
    const key = `${item.name.toLowerCase()}_${item.state.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
      if (unique.length >= limit) break;
    }
  }

  return unique;
}
