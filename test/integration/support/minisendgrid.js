class TestApplication extends MiniApplication {
  constructor(options) {
    super(options);
    this.stubApp("get", "test");
  }
}
