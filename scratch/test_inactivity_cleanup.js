async function testInactivityCleanup() {
  const username = 'user_' + Date.now();
  console.log(`=== TEST 1: CREATE TEST MAILBOX (${username}) WITH LETTERS ===`);
  const createRes = await fetch('http://localhost:3000/api/mailbox/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      gender: 'male',
      durationKey: '7d',
      name: 'Inactive Tester'
    })
  });
  const createJson = await createRes.json();
  console.log('Create status:', createRes.status, 'User:', createJson.data?.username);
  if (!createJson.ok) throw new Error('Failed to create test mailbox: ' + JSON.stringify(createJson));

  // Send a letter to this mailbox so we can verify cascade deletion
  const sendRes = await fetch('http://localhost:3000/api/letters/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: username,
      body: 'Hello, this letter should be purged after 7 days of inactivity',
      paper: 'midnight',
      stamp: 'topSecret',
      hints: ['A ghost'],
      burnAfterReading: false,
      isAnonymous: true,
      mode: { kind: 'none' }
    })
  });
  const sendJson = await sendRes.json();
  console.log('Send letter status:', sendRes.status, 'Letter ID:', sendJson.data?.id);

  // Verify mailbox is currently alive and active
  const checkAlive = await fetch(`http://localhost:3000/api/mailbox/${username}`);
  console.log('Pre-inactivity public check status (expected 200):', checkAlive.status);
  if (checkAlive.status !== 200) throw new Error('Mailbox should be active initially');

  console.log('\n=== TEST 2: ARTIFICIALLY AGE lastLoginAt TO 8 DAYS AGO ===');
  const ageRes = await fetch('http://localhost:3000/api/cron/cleanup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      setAgeDays: 8
    })
  });
  const ageJson = await ageRes.json();
  console.log('Age response:', ageJson);
  if (!ageJson.ok) throw new Error('Failed to age mailbox');

  console.log('\n=== TEST 3: TRIGGER LAZY DELETION VIA PUBLIC LOOKUP ===');
  const lazyCheck = await fetch(`http://localhost:3000/api/mailbox/${username}`);
  console.log('Post-inactivity public check status (expected 410):', lazyCheck.status);
  if (lazyCheck.status !== 410) {
    throw new Error(`Expected status 410 GONE, got ${lazyCheck.status}`);
  }
  console.log('✅ LAZY INACTIVITY PURGE VERIFIED (returned 410 GONE)!');

  console.log('\n=== TEST 4: VERIFY USERNAME CAN BE RE-REGISTERED (RELEASED RESERVATION) ===');
  const reCreateRes = await fetch('http://localhost:3000/api/mailbox/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      gender: 'female',
      durationKey: '24h',
      name: 'Reclaimed Handle'
    })
  });
  const reCreateJson = await reCreateRes.json();
  console.log('Re-registration status (expected 200):', reCreateRes.status, 'Success:', reCreateJson.ok);
  if (!reCreateJson.ok) throw new Error('Failed to reclaim purged username');
  console.log('✅ RESERVATION RELEASE VERIFIED (username successfully re-registered)!');

  console.log('\n=== TEST 5: TEST CRON CLEANUP ROUTE ===');
  // Age re-registered user to 8 days in past again
  await fetch('http://localhost:3000/api/cron/cleanup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      setAgeDays: 8
    })
  });

  const cronRes = await fetch('http://localhost:3000/api/cron/cleanup');
  const cronJson = await cronRes.json();
  console.log('Cron cleanup status:', cronRes.status, 'Response:', cronJson);

  if (cronJson.ok && cronJson.purgedCount >= 1) {
    console.log('✅ CRON ENDPOINT PURGE VERIFIED!');
  } else {
    throw new Error('❌ Cron endpoint failed to purge expired account');
  }

  // Confirm mailbox is gone after cron run
  const postCronCheck = await fetch(`http://localhost:3000/api/mailbox/${username}`);
  console.log('Post-cron public lookup status (expected 404 or 410):', postCronCheck.status);
  if (postCronCheck.status === 200) {
    throw new Error('Mailbox should not exist after cron purge');
  }

  console.log('\n🎉 ALL 7-DAY INACTIVITY AUTO-CLEANUP TESTS PASSED SUCCESSFULLY!');
}

testInactivityCleanup().catch(err => {
  console.error(err);
  process.exit(1);
});
