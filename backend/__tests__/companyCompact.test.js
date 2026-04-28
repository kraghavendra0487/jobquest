// backend/__tests__/companyCompact.test.js 
const { compressCompany, extractStructured } = require('../utils/companyCompact'); 

const sample = `About the company 
Protea Digital Pvt. Ltd. 
 427 followers 
 Follow 
 Advertising Services 2-10 employees 5 on LinkedIn 
 A new age forward thinking digital solutions Company dedicated to help brands amplify & thrive in the digital world. Our team is passionate about innovation, strategy and creating meaningful connection between brands and their audiences. We bring to the table an extended team for your brands with deep understanding of Enterprise, Startups & SMB decision makers. With Protea, combine creativity with data driven insights & navigate the fast-paced digital landscape with exceptional results and grow to new heights. 
 … 
 show more`; 

console.log('Compact:', compressCompany(sample)); 
console.log('Structured:', extractStructured(sample)); 
