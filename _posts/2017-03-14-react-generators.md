---
layout:     post
title:      "Simplify complex React components with generatos"
date:       2017-03-14 11:00:00
keywords:   javascript, js, react
---

Sometimes writing complex React components, like huge dynamic forms,
isn't easy. By default for control flow in JSX we use conditional
operator, so, for example, a complex form with some logic will look like:
  
~~~javascript
class Form extends Component {
  propTypes: {
    importedAccount: boolean,
    corporateClient: boolean,
  };

  render() {
    return (
      <div>
        <form>
          {!this.props.importedAccount ? (
              <label>
                First Name
                <input type="text"/>
              </label>
            ) : null}
          {!this.props.importedAccount ? (
              <label>
                First Name
                <input type="text"/>
              </label>
            ) : null}
          {this.props.corporateClient ? (
              <label>
                Organization
                <input type="text"/>
              </label>
            ) : null}
          {this.props.corporateClient ? (
              <label>
                Role
                <input type="text"/>
              </label>
            ) : null}
          {!this.props.corporateClient ? (
              <label>
                Billing address
                <input type="text"/>
              </label>
            ) : null}
        </form>
      </div>
    );
  }
}
~~~

But that much of ternary operators looks ugly. And explicitly writing
`... ? ... : null` isn't fun at all. So we can try a bit different
approach, we can extract all these inputs to separate methods, like:

~~~javascript
class Form extends Component {
  propTypes: {
    importedAccount: boolean,
    corporateClient: boolean,
  };

  renderFirstNameInput() {
    if (!this.props.importedAccount) {
      return (
        <label>
          First Name
          <input type="text"/>
        </label>
      );
    }
  }

  renderLastNameInput() {
    if (!this.props.importedAccount) {
      return (
        <label>
          First Name
          <input type="text"/>
        </label>
      );
    }
  }

  renderOrganizationInput() {
    if (this.props.corporateClient) {
      return (
        <label>
          Organization
          <input type="text"/>
        </label>
      );
    }
  }

  renderRoleInput() {
    if (this.props.corporateClient) {
      return (
        <label>
          Role
          <input type="text"/>
        </label>
      );
    }
  }

  renderBillingAddressInput() {
    if (!this.props.corporateClient) {
      return (
        <label>
          Billing address
          <input type="text"/>
        </label>
      );
    }
  }

  render() {
    return (
      <div>
        <form>
          {this.renderFirstNameInput()}
          {this.renderLastNameInput()}
          {this.renderOrganizationInput()}
          {this.renderRoleInput()}
          {this.renderBillingAddressInput()}
        </form>
      </div>
    );
  }
}
~~~

Looks much nicer, but it's a bit bloated, there's too much code. Another
approach is to create some generator method and convert it to an array
in `render` method, like:

~~~javascript
class Form extends Component {
  propTypes: {
    importedAccount: boolean,
    corporateClient: boolean,
  };

  *renderForm() {
    if (!this.props.importedAccount) {
      yield (
        <label key="first-name">
          First Name
          <input type="text"/>
        </label>
      );
      yield (
        <label key="last-name">
          Last Name
          <input type="text"/>
        </label>
      );
    }

    if (this.props.corporateClient) {
      yield (
        <label key="organization">
          Organization
          <input type="text"/>
        </label>
      );
      yield (
        <label key="role">
          Role
          <input type="text"/>
        </label>
      );
    } else {
      yield (
        <label key="billing-address">
          Billing address
          <input type="text"/>
        </label>
      );
    }
  }

  render() {
    return (
      <div>
        <form>
          {[...this.renderForm()]}
        </form>
      </div>
    );
  }
}
~~~

So it looks much nicer, there's far way less code than in methods approach,
it looks less hackish than conditional operator approach. And we finally
can have easily readable control flow.
