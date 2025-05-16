export class TestService {
  constructor() {}
  async clearDb() {
    // const query = `
    //   DO
    //   $$
    //   DECLARE
    //       r RECORD;
    //   BEGIN
    //       FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'migrations') LOOP
    //           EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
    //       END LOOP;
    //   END
    //   $$;
    // `;
    //
    // await this.dataSource.query(query);
  }

  async delay(ms: number) {
    return new Promise(res => {
      setTimeout(() => res('Success'), ms);
    });
  }
}
