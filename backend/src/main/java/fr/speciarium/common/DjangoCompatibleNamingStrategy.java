package fr.speciarium.common;

import org.hibernate.boot.model.naming.Identifier;
import org.hibernate.boot.model.naming.PhysicalNamingStrategyStandardImpl;
import org.hibernate.engine.jdbc.env.spi.JdbcEnvironment;

public class DjangoCompatibleNamingStrategy extends PhysicalNamingStrategyStandardImpl {

    @Override
    public Identifier toPhysicalTableName(Identifier name, JdbcEnvironment jdbcEnv) {
        if (name == null) return null;
        return Identifier.toIdentifier(name.getText().toLowerCase());
    }

    @Override
    public Identifier toPhysicalColumnName(Identifier name, JdbcEnvironment jdbcEnv) {
        if (name == null) return null;
        return Identifier.toIdentifier(name.getText().toLowerCase());
    }
}
